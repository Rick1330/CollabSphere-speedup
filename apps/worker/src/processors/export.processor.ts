import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job, Queue } from "bullmq";
import { processExportJob } from "../jobs/export.processor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { WORKER_QUEUES } from "../queues/queue-names.js";

@Processor(WORKER_QUEUES.EXPORTS, {
  concurrency: 5,
  lockDuration: 120_000,
})
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WORKER_QUEUES.EXPORTS_DLQ) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job<{ exportJobId: string }>) {
    return processExportJob(job, { prisma: this.prisma });
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job | undefined, error: Error) {
    const payload = {
      event: "worker.job.failed",
      queue: WORKER_QUEUES.EXPORTS,
      jobId: job?.id ?? "unknown",
      attemptsMade: job?.attemptsMade ?? 0,
      error: error.message,
    };
    this.logger.error(JSON.stringify(payload));
    await this.dlq.add("failed-export", payload, {
      jobId: `dlq:export:${job?.id ?? Date.now()}`,
      removeOnComplete: 500,
      removeOnFail: 500,
    });
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(
      JSON.stringify({ event: "worker.job.completed", queue: WORKER_QUEUES.EXPORTS, jobId: job.id }),
    );
  }
}
