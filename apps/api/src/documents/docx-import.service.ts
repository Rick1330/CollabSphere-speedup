import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import type { DocxImportResult } from "@collabsphere/docx-import";
import {
  getDocxImportTmpDir,
  getDocxInputPath,
  readImportArtifact,
} from "@collabsphere/docx-import/server";
import { JobTypes, Queues, type ImportDocxJobData } from "@collabsphere/shared/jobs";
import type { Queue } from "bullmq";

/** BullMQ forbids ':' in custom jobId (see bullmq Job.validateOptions). */
export const docxImportBullJobId = (importJobId: string) => `docx-import-${importJobId}`;

export type DocxImportEnqueueResult = {
  importJobId: string;
  status: "queued";
};

export type DocxImportCompletedResult = Pick<
  DocxImportResult,
  "content" | "pageSetup" | "warnings" | "metadata"
>;

export type DocxImportStatusResult =
  | {
      importJobId: string;
      status: "queued" | "active" | "delayed" | "waiting";
      progress?: number;
    }
  | {
      importJobId: string;
      status: "completed";
      progress: 100;
      result: DocxImportCompletedResult;
    }
  | {
      importJobId: string;
      status: "failed";
      errorMessage: string;
      progress?: number;
    };

@Injectable()
export class DocxImportService implements OnModuleInit {
  private readonly logger = new Logger(DocxImportService.name);

  constructor(
    @InjectQueue(Queues.DOCX_IMPORT) private readonly docxImportQueue: Queue<ImportDocxJobData>,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    this.logger.log(`DOCX import temp directory: ${getDocxImportTmpDir()}`);
  }

  async enqueueDocxImport(input: {
    workspaceId: string;
    documentId: string;
    actorUserId: string;
    fileBuffer: Buffer;
  }): Promise<DocxImportEnqueueResult> {
    const importJobId = randomUUID();
    const tmpDir = getDocxImportTmpDir();

    try {
      await fs.mkdir(tmpDir, { recursive: true });
      const inputPath = getDocxInputPath(importJobId);
      await fs.writeFile(inputPath, input.fileBuffer);

      const stat = await fs.stat(inputPath);
      if (!stat.isFile()) {
        throw new Error(`DOCX upload was not persisted at ${inputPath}`);
      }
      if (stat.size !== input.fileBuffer.length) {
        throw new Error(
          `DOCX upload size mismatch at ${inputPath} (wrote ${input.fileBuffer.length}, on disk ${stat.size})`,
        );
      }

      const statBeforeQueue = await fs.stat(inputPath);
      if (!statBeforeQueue.isFile()) {
        throw new Error(`DOCX file missing before queue at ${inputPath}`);
      }

      if (process.env.NODE_ENV !== "production") {
        this.logger.log(
          `DOCX enqueued ${importJobId} at ${inputPath} (${statBeforeQueue.size} bytes, tmpDir=${tmpDir})`,
        );
      }

      await this.docxImportQueue.add(
        JobTypes.IMPORT_DOCX_HTML,
        {
          importJobId,
          inputPath,
          workspaceId: input.workspaceId,
          documentId: input.documentId,
          actorUserId: input.actorUserId,
        },
        {
          jobId: docxImportBullJobId(importJobId),
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5_000,
          },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );

      return { importJobId, status: "queued" };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`DOCX enqueue failed for ${importJobId}: ${errMessage}`);
      throw error;
    }
  }

  async getDocxImportStatus(importJobId: string): Promise<DocxImportStatusResult | null> {
    const job = await this.docxImportQueue.getJob(docxImportBullJobId(importJobId));
    if (!job) return null;

    const progress =
      typeof job.progress === "number"
        ? job.progress
        : typeof job.progress === "string"
          ? Number.parseFloat(job.progress)
          : undefined;

    const state = await job.getState();
    if (state === "completed") {
      const returnvalue = job.returnvalue as
        | { artifactPath?: string }
        | DocxImportCompletedResult
        | undefined;

      if (returnvalue && "content" in returnvalue) {
        return {
          importJobId,
          status: "completed",
          progress: 100,
          result: returnvalue as DocxImportCompletedResult,
        };
      }

      try {
        const artifact = await readImportArtifact(importJobId);
        return {
          importJobId,
          status: "completed",
          progress: 100,
          result: {
            content: artifact.content,
            pageSetup: artifact.pageSetup,
            warnings: artifact.warnings,
            metadata: artifact.metadata,
          },
        };
      } catch (error) {
        return {
          importJobId,
          status: "failed",
          errorMessage:
            error instanceof Error
              ? `Import completed but artifact missing: ${error.message}`
              : "Import artifact not found",
          progress,
        };
      }
    }

    if (state === "failed") {
      return {
        importJobId,
        status: "failed",
        errorMessage: job.failedReason ?? "DOCX import failed",
        progress,
      };
    }

    const normalized =
      state === "active" || state === "delayed" || state === "waiting" ? state : "queued";
    return { importJobId, status: normalized, progress };
  }
}
