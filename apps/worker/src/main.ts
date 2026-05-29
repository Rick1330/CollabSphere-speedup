import { Redis } from "ioredis";
import { startExportProcessor } from "./jobs/export.processor.js";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const exportWorker = startExportProcessor(connection);

exportWorker.on("completed", (job) => {
  console.log(`[worker] export completed ${job.id}`);
});

exportWorker.on("failed", (job, error) => {
  console.error(`[worker] export failed ${job?.id}`, error);
});

console.log("[worker] export processor listening on queue: export");
