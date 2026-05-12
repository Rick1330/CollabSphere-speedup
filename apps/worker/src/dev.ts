import { EnvValidationError, parseRuntimeEnv } from "../../../packages/shared/src/runtime-env.js";
import { validateServiceEnv } from "../../../packages/shared/src/bootstrap-runtime.js";
import { startVerificationEmailProcessor } from "./jobs/email/verification-email-processor.js";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { WORKER_QUEUES } from "./jobs/queues.js";
import { processTaskReminderJob } from "./jobs/task-reminders.processor.js";
import { processExportJob } from "./jobs/export.processor.js";

const defaultHeartbeatMs = 5000;
const minHeartbeatMs = 1000;
const maxHeartbeatMs = 60000;

const parseHeartbeatMs = (value: string | undefined) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return defaultHeartbeatMs;
  }

  if (!/^\d+$/.test(trimmed)) {
    console.warn(`[worker] invalid WORKER_HEARTBEAT_MS value "${value}", falling back to ${defaultHeartbeatMs}ms`);
    return defaultHeartbeatMs;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.warn(`[worker] invalid WORKER_HEARTBEAT_MS value "${value}", falling back to ${defaultHeartbeatMs}ms`);
    return defaultHeartbeatMs;
  }

  if (parsed < minHeartbeatMs) {
    console.warn(`[worker] WORKER_HEARTBEAT_MS below minimum, clamping to ${minHeartbeatMs}ms`);
    return minHeartbeatMs;
  }

  if (parsed > maxHeartbeatMs) {
    console.warn(`[worker] WORKER_HEARTBEAT_MS above maximum, clamping to ${maxHeartbeatMs}ms`);
    return maxHeartbeatMs;
  }

  return parsed;
};

const workerEnv = validateServiceEnv({
  service: "worker",
  parser: parseRuntimeEnv,
  validationErrorClass: EnvValidationError,
});
const prisma = new PrismaClient();
const redis = new Redis(workerEnv.REDIS_URL, { maxRetriesPerRequest: null });
const exportsDlq = new Queue(WORKER_QUEUES.EXPORTS_DLQ, { connection: redis });
const remindersDlq = new Queue(WORKER_QUEUES.TASK_REMINDERS_DLQ, { connection: redis });
const exportsQueue = new Queue(WORKER_QUEUES.EXPORTS, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 250,
    removeOnFail: 250,
  },
});
const remindersQueue = new Queue(WORKER_QUEUES.TASK_REMINDERS, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2_000,
    },
    removeOnComplete: 250,
    removeOnFail: 250,
  },
});
const exportsWorker = new Worker(
  WORKER_QUEUES.EXPORTS,
  (job: Parameters<typeof processExportJob>[0]) => processExportJob(job, { prisma }),
  { connection: redis, concurrency: 5, lockDuration: 120_000 },
);
const remindersWorker = new Worker(
  WORKER_QUEUES.TASK_REMINDERS,
  (job: Parameters<typeof processTaskReminderJob>[0]) => processTaskReminderJob(job, { prisma }),
  { connection: redis, concurrency: 2, lockDuration: 120_000 },
);
const stopVerificationEmailProcessor = startVerificationEmailProcessor({
  jwtAccessSecret: workerEnv.JWT_ACCESS_SECRET,
  baseUrl: workerEnv.BASE_URL,
});

const heartbeatMs = parseHeartbeatMs(process.env.WORKER_HEARTBEAT_MS);

console.log("[worker] bootstrap started");
console.log(`[worker] heartbeat interval ${heartbeatMs}ms`);

exportsWorker.on("completed", (job) => {
  console.info(JSON.stringify({ event: "worker.job.completed", queue: WORKER_QUEUES.EXPORTS, jobId: job.id }));
});
remindersWorker.on("completed", (job) => {
  console.info(
    JSON.stringify({ event: "worker.job.completed", queue: WORKER_QUEUES.TASK_REMINDERS, jobId: job.id }),
  );
});
exportsWorker.on("failed", (job, error) => {
  const payload = {
    event: "worker.job.failed",
    queue: WORKER_QUEUES.EXPORTS,
    jobId: job?.id ?? "unknown",
    attemptsMade: job?.attemptsMade ?? 0,
    error: error.message,
  };
  console.error(JSON.stringify(payload));
  void exportsDlq.add("failed-export", payload, {
    jobId: `dlq:export:${job?.id ?? Date.now()}`,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
});
remindersWorker.on("failed", (job, error) => {
  const payload = {
    event: "worker.job.failed",
    queue: WORKER_QUEUES.TASK_REMINDERS,
    jobId: job?.id ?? "unknown",
    attemptsMade: job?.attemptsMade ?? 0,
    error: error.message,
  };
  console.error(JSON.stringify(payload));
  void remindersDlq.add("failed-reminder", payload, {
    jobId: `dlq:reminder:${job?.id ?? Date.now()}`,
    removeOnComplete: 500,
    removeOnFail: 500,
  });
});

const timer = setInterval(() => {
  console.log(`[worker] heartbeat ${new Date().toISOString()}`);
}, heartbeatMs);
const reminderTimer = setInterval(() => {
  void remindersQueue.add("scan", {}, { removeOnComplete: true, removeOnFail: true });
}, 10 * 60 * 1000);

const shutdown = (signal: string) => {
  console.log(`[worker] received ${signal}, shutting down`);
  stopVerificationEmailProcessor();
  clearInterval(timer);
  clearInterval(reminderTimer);
  void Promise.all([
    exportsWorker.close(),
    remindersWorker.close(),
    exportsQueue.close(),
    remindersQueue.close(),
    exportsDlq.close(),
    remindersDlq.close(),
    redis.quit(),
    prisma.$disconnect(),
  ]).finally(() => process.exit(0));
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
