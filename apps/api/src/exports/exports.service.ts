import { Inject, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import fs from "node:fs/promises";
import path from "node:path";
import {
  JobTypes,
  Queues,
  type ExportJobData,
  type ExportPageSetup,
} from "@collabsphere/shared/jobs";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

const storageRoot = path.resolve(process.env.STORAGE_LOCAL_PATH ?? "./uploads");

export const exportBullJobId = (exportJobId: string) => `export-${exportJobId}`;

@Injectable()
export class ExportsService {
  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    @InjectQueue(Queues.EXPORT) private readonly exportQueue: Queue<ExportJobData>,
  ) {}

  async createExport(input: {
    actorUserId: string;
    workspaceId: string;
    resourceId: string;
    format: "pdf" | "markdown";
    pageSetup?: ExportPageSetup;
  }) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: input.workspaceId,
        userId: input.actorUserId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!member) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }
    const doc = await this.prisma.document.findFirst({
      where: {
        id: input.resourceId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!doc) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }
    const created = await this.prisma.exportJob.create({
      data: {
        workspaceId: input.workspaceId,
        requestedById: input.actorUserId,
        resourceType: "document",
        resourceId: input.resourceId,
        format: input.format,
        status: "queued",
      },
    });

    const jobType = input.format === "pdf" ? JobTypes.EXPORT_PDF : JobTypes.EXPORT_MARKDOWN;
    await this.exportQueue.add(
      jobType,
      {
        exportJobId: created.id,
        documentId: input.resourceId,
        workspaceId: input.workspaceId,
        requestedBy: input.actorUserId,
        format: input.format,
        pageSetup: input.pageSetup,
      },
      {
        jobId: exportBullJobId(created.id),
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 5_000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
    return created;
  }

  async getExport(input: { actorUserId: string; exportJobId: string }) {
    const job = await this.prisma.exportJob.findFirst({
      where: {
        id: input.exportJobId,
        deletedAt: null,
      },
    });
    if (!job) {
      throw new AppError({ code: "EXPORT_JOB_NOT_FOUND" });
    }
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: job.workspaceId,
        userId: input.actorUserId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!member) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }
    return {
      ...job,
      downloadUrl: job.outputStorageKey ? `/api/v1/exports/${job.id}/download` : null,
    };
  }

  async resolveExportDownloadPath(exportJobId: string, actorUserId: string): Promise<string> {
    const job = await this.getExport({ actorUserId, exportJobId });
    if (job.status !== "completed" || !job.outputStorageKey) {
      throw new AppError({ code: "EXPORT_NOT_READY", message: "Export is not ready for download." });
    }
    const filePath = path.join(storageRoot, job.outputStorageKey);
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError({ code: "EXPORT_NOT_READY", message: "Export file is not available." });
    }
    return filePath;
  }
}
