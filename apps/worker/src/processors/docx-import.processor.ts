import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger, type OnModuleInit } from "@nestjs/common";
import type { ImportDocxJobData } from "@collabsphere/shared/jobs";
import { JobTypes } from "@collabsphere/shared/jobs";
import {
  extractDataUriImagesFromHtml,
  getDocxHtmlPath,
  getDocxImportTmpDir,
  getDocxInputPath,
  readDocxBuffer,
  writeImportArtifact,
  type DocxImportJobReturnValue,
} from "@collabsphere/docx-import/server";
import { tiptapJsonToYjsUpdate } from "@collabsphere/docx-import";
import {
  DOCUMENT_IMPORT_LOCK_TTL_SECONDS,
  documentImportLockKey,
} from "@collabsphere/shared";
import { DOCUMENT_RESTORED_CHANNEL } from "../../../../packages/shared/src/collab/document-restore-channel.js";
import type { Job, Queue } from "bullmq";
import { Redis } from "ioredis";
import { DocxParserService } from "../services/docx-parser.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { LibreOfficeService } from "../services/libreoffice.service.js";
import { StorageService } from "../services/storage.service.js";
import { TipTapTransformerService } from "../services/tiptap-transformer.service.js";
import { WORKER_QUEUES } from "../queues/queue-names.js";

const MAX_DOCX_BYTES = 100 * 1024 * 1024;

@Processor(WORKER_QUEUES.DOCX_IMPORTS, {
  concurrency: 2,
  lockDuration: 120_000,
})
export class DocxImportProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DocxImportProcessor.name);
  private readonly redisPublisher: Redis | null;
  private warnedDocxParserInjection = false;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LibreOfficeService) private readonly libreOffice: LibreOfficeService,
    @Inject(DocxParserService) private readonly docxParser: DocxParserService,
    @Inject(TipTapTransformerService) private readonly tiptapTransformer: TipTapTransformerService,
    @Inject(StorageService) private readonly storage: StorageService,
    @InjectQueue(WORKER_QUEUES.DOCX_IMPORTS_DLQ) private readonly dlq: Queue,
  ) {
    super();
    const redisUrl = process.env.REDIS_URL?.trim() || undefined;
    this.redisPublisher = redisUrl
      ? new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        })
      : null;
    if (!redisUrl) {
      this.logger.warn("REDIS_URL is not set; DOCX import cannot notify collab to reload documents");
    } else {
      this.logger.log(`DOCX import worker Redis: ${redisUrl}`);
    }
  }

  onModuleInit(): void {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    this.logger.log(`DOCX import worker tmpDir=${getDocxImportTmpDir()}`);
  }

  async process(job: Job<ImportDocxJobData>): Promise<DocxImportJobReturnValue> {
    if (job.name !== JobTypes.IMPORT_DOCX_HTML) {
      this.logger.warn(`Skipping unknown job name: ${job.name}`);
      return {
        artifactPath: "",
        pageSetup: { format: "a4", orientation: "portrait", margins: { top: 96, right: 96, bottom: 96, left: 96 } },
        metadata: { pageCount: 1, wordCount: 0, characterCount: 0, hasImages: false, hasTables: false },
        warnings: [{ type: "warning", message: `Unknown job: ${job.name}` }],
        contentByteLength: 0,
      };
    }

    const { importJobId, documentId } = job.data;
    const { inputPath, pathSource } = this.resolveInputPath(job.data);

    if (process.env.NODE_ENV !== "production") {
      this.logger.log(
        `DOCX import ${importJobId} tmpDir=${getDocxImportTmpDir()} input=${inputPath} (path=${pathSource})`,
      );
    }

    await job.updateProgress(5);
    await this.validateDocxFile(inputPath);

    await job.updateProgress(10);
    const docxBuffer = await this.readDocxFileBuffer(inputPath);

    await job.updateProgress(30);
    const rawHtml = await fs.readFile(
      await this.libreOffice.convertToHtml(inputPath),
      "utf-8",
    );

    await job.updateProgress(50);
    const { html: htmlWithoutDataUris, images: dataUriImages } =
      extractDataUriImagesFromHtml(rawHtml);
    const imageUrlByFilename = await this.processImages(
      docxBuffer,
      documentId,
      job,
      dataUriImages,
    );
    const result = await this.tiptapTransformer.transform({
      docxBuffer,
      htmlFromLibreOffice: htmlWithoutDataUris,
      imageUrlByFilename,
    });
    const yjsState = tiptapJsonToYjsUpdate(result.content);

    await this.setImportLock(documentId);
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        contentYjs: Buffer.from(yjsState),
        updatedById: job.data.actorUserId,
      },
    });
    await this.publishDocumentRestored(documentId);

    await job.updateProgress(90);
    const artifactPath = await writeImportArtifact(importJobId, result);
    const contentByteLength = Buffer.byteLength(JSON.stringify(result.content), "utf-8");

    await job.updateProgress(95);
    await this.cleanupImportTempFiles(importJobId, inputPath);

    await job.updateProgress(100);
    this.logger.log(
      `DOCX import ${importJobId} complete: ${result.metadata.pageCount} pages, ${result.metadata.wordCount} words`,
    );

    return {
      artifactPath,
      pageSetup: result.pageSetup,
      metadata: result.metadata,
      warnings: result.warnings,
      contentByteLength,
    };
  }

  private resolveInputPath(data: ImportDocxJobData): {
    inputPath: string;
    pathSource: "job.payload" | "recomputed";
  } {
    const enqueued = data.inputPath?.trim();
    if (enqueued && existsSync(enqueued)) {
      return { inputPath: enqueued, pathSource: "job.payload" };
    }
    return {
      inputPath: getDocxInputPath(data.importJobId),
      pathSource: "recomputed",
    };
  }

  private async readDocxFileBuffer(inputPath: string): Promise<ArrayBuffer> {
    if (this.docxParser?.readBuffer) {
      return this.docxParser.readBuffer(inputPath);
    }

    if (!this.warnedDocxParserInjection) {
      this.warnedDocxParserInjection = true;
      this.logger.warn(
        "DocxParserService was not injected; using readDocxBuffer fallback (check reflect-metadata / tsx)",
      );
    }
    return readDocxBuffer(inputPath);
  }

  private async extractDocxImages(docxBuffer: ArrayBuffer): Promise<Map<string, Buffer>> {
    if (this.docxParser?.extractImages) {
      return this.docxParser.extractImages(docxBuffer);
    }
    const { extractImagesFromDocx } = await import("@collabsphere/docx-import/server");
    return extractImagesFromDocx(docxBuffer);
  }

  private async cleanupImportTempFiles(
    importJobId: string,
    inputPath: string,
  ): Promise<void> {
    const htmlPath = getDocxHtmlPath(importJobId);
    await fs.rm(inputPath, { force: true }).catch(() => undefined);
    await fs.rm(htmlPath, { force: true }).catch(() => undefined);
  }

  private isFinalJobAttempt(job: Job | undefined): boolean {
    if (!job) {
      return true;
    }
    const maxAttempts =
      typeof job.opts.attempts === "number" && job.opts.attempts > 0 ? job.opts.attempts : 1;
    return job.attemptsMade >= maxAttempts;
  }

  private async validateDocxFile(filePath: string): Promise<void> {
    try {
      const stat = await fs.stat(filePath);
      if (stat.size > MAX_DOCX_BYTES) {
        throw new Error(`File too large (${stat.size} bytes, max ${MAX_DOCX_BYTES})`);
      }
      const header = await fs.readFile(filePath, { encoding: "binary", flag: "r" });
      if (!header.startsWith("PK")) {
        throw new Error("Invalid DOCX file: not a ZIP archive");
      }
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";
      if (code === "ENOENT") {
        const tmpDir = getDocxImportTmpDir();
        let dirHint = "";
        try {
          const names = await fs.readdir(tmpDir);
          dirHint =
            names.length > 0
              ? `; tmpDir listing (first 8): ${names.slice(0, 8).join(", ")}`
              : "; tmpDir is empty (API may not have written the file yet, or wrong worker consumed the job)";
        } catch {
          dirHint = `; cannot read tmpDir ${tmpDir}`;
        }
        const pathHint = filePath.includes("AppData\\Local\\Temp")
          ? " Path is under %TEMP% — likely a stale Docker/host worker with wrong DOCX_IMPORT_TMP_DIR. Run: docker rm -f collabsphere-worker; set DEV_WORKER_DOCKER=0; restart pnpm dev."
          : "";
        throw new Error(
          `ENOENT: DOCX not found at ${filePath} (worker tmpDir=${tmpDir}${dirHint})${pathHint}`,
        );
      }
      throw error;
    }
  }

  private async processImages(
    docxBuffer: ArrayBuffer,
    documentId: string,
    job: Job<ImportDocxJobData>,
    extraImages?: Map<string, Buffer>,
  ): Promise<Map<string, string>> {
    const urls = new Map<string, string>();
    const images = await this.extractDocxImages(docxBuffer);
    const allImages = new Map(images);
    extraImages?.forEach((buffer, filename) => allImages.set(filename, buffer));
    if (allImages.size === 0) return urls;

    let index = 0;
    for (const [filename, buffer] of allImages) {
      const url = await this.storage.uploadDocumentImage(documentId, filename, buffer);
      urls.set(filename, url);
      index += 1;
      await job.updateProgress(70 + Math.min(15, Math.floor((index / allImages.size) * 15)));
    }
    return urls;
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<ImportDocxJobData> | undefined, error: Error) {
    const payload = {
      event: "worker.job.failed",
      queue: WORKER_QUEUES.DOCX_IMPORTS,
      jobId: job?.id ?? "unknown",
      attemptsMade: job?.attemptsMade ?? 0,
      error: error.message,
    };
    this.logger.error(JSON.stringify(payload));

    if (job && this.isFinalJobAttempt(job)) {
      const { inputPath } = this.resolveInputPath(job.data);
      await this.cleanupImportTempFiles(job.data.importJobId, inputPath);
    }

    await this.dlq.add("failed-docx-import", payload, {
      jobId: `dlq-docx-import-${job?.id ?? Date.now()}`,
      removeOnComplete: 500,
      removeOnFail: 500,
    });
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(
      JSON.stringify({
        event: "worker.job.completed",
        queue: WORKER_QUEUES.DOCX_IMPORTS,
        jobId: job.id,
      }),
    );
  }

  private async setImportLock(documentId: string): Promise<void> {
    if (!this.redisPublisher) return;
    try {
      if (this.redisPublisher.status === "wait") {
        await this.redisPublisher.connect();
      }
      await this.redisPublisher.setex(
        documentImportLockKey(documentId),
        DOCUMENT_IMPORT_LOCK_TTL_SECONDS,
        "1",
      );
    } catch (error) {
      this.logger.warn(
        `Failed to set import lock for ${documentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async publishDocumentRestored(documentId: string): Promise<void> {
    if (!this.redisPublisher) {
      throw new Error(
        "REDIS_URL is not configured; cannot notify collab server after DOCX import",
      );
    }

    if (this.redisPublisher.status === "wait") {
      await this.redisPublisher.connect();
    }
    await this.redisPublisher.publish(
      DOCUMENT_RESTORED_CHANNEL,
      JSON.stringify({ documentId }),
    );
  }
}
