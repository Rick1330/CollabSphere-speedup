import { Inject, Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

@Injectable()
export class ExportsService {
  private readonly queue: Queue;

  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {
    const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    this.queue = new Queue("exports", {
      connection: new Redis(redisUrl, { maxRetriesPerRequest: null }),
    });
  }

  async createExport(input: {
    actorUserId: string;
    workspaceId: string;
    resourceId: string;
    format: "pdf" | "markdown";
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
    await this.queue.add(
      "export",
      { exportJobId: created.id },
      {
        jobId: `export:${created.id}`,
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
}
