import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { startExportProcessor } from "./jobs/export.processor.js";
import { EXPORTS_DLQ, TASK_REMINDERS_DLQ } from "./jobs/queues.js";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const exportsDlq = new Queue(EXPORTS_DLQ, { connection });
const remindersDlq = new Queue(TASK_REMINDERS_DLQ, { connection });

const exportWorker = startExportProcessor(connection);

exportWorker.on("failed", async (job, error) => {
  console.error("worker.job.failed", job?.id, error);
  if (job) {
    await exportsDlq.add("export-failed", { jobId: job.id, reason: String(error) }, { attempts: 5 });
    await remindersDlq.add("reminder-failed", { jobId: job.id }, { attempts: 3 });
  }
});

console.log("[worker] dev bootstrap: export worker + DLQ handlers");
