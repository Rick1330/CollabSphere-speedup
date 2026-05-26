import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job, Queue } from "bullmq";
import { processTaskReminderJob } from "../jobs/task-reminders.processor.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { WORKER_QUEUES } from "../queues/queue-names.js";

@Processor(WORKER_QUEUES.TASK_REMINDERS, {
  concurrency: 2,
  lockDuration: 120_000,
})
export class TaskRemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskRemindersProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WORKER_QUEUES.TASK_REMINDERS_DLQ) private readonly dlq: Queue,
  ) {
    super();
  }

  async process(job: Job) {
    return processTaskReminderJob(job, { prisma: this.prisma });
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job | undefined, error: Error) {
    const payload = {
      event: "worker.job.failed",
      queue: WORKER_QUEUES.TASK_REMINDERS,
      jobId: job?.id ?? "unknown",
      attemptsMade: job?.attemptsMade ?? 0,
      error: error.message,
    };
    this.logger.error(JSON.stringify(payload));
    await this.dlq.add("failed-reminder", payload, {
      jobId: `dlq:reminder:${job?.id ?? Date.now()}`,
      removeOnComplete: 500,
      removeOnFail: 500,
    });
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(
      JSON.stringify({
        event: "worker.job.completed",
        queue: WORKER_QUEUES.TASK_REMINDERS,
        jobId: job.id,
      }),
    );
  }
}
