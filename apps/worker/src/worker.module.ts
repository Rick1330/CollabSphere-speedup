import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import workerConfig from "./config/worker.config.js";
import { DocxImportProcessor } from "./processors/docx-import.processor.js";
import { ExportProcessor } from "./processors/export.processor.js";
import { TaskRemindersProcessor } from "./processors/task-reminders.processor.js";
import { WorkerPrismaModule } from "./prisma/prisma.module.js";
import { WORKER_QUEUES } from "./queues/queue-names.js";
import { DocxParserService } from "./services/docx-parser.service.js";
import { EmailBootstrapService } from "./services/email-bootstrap.service.js";
import { LibreOfficeService } from "./services/libreoffice.service.js";
import { StorageService } from "./services/storage.service.js";
import { TaskReminderSchedulerService } from "./services/task-reminder-scheduler.service.js";
import { TipTapTransformerService } from "./services/tiptap-transformer.service.js";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const workerEnvFiles = [
  join(repoRoot, ".env"),
  join(repoRoot, ".env.local"),
  join(repoRoot, "apps", "worker", ".env.worker"),
].filter((filePath) => existsSync(filePath));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: workerEnvFiles.length > 0 ? workerEnvFiles : [join(repoRoot, ".env")],
      load: [workerConfig],
    }),
    WorkerPrismaModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>("worker.redisUrl") ?? process.env.REDIS_URL,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: { age: 3600, count: 100 },
          removeOnFail: { age: 86_400 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: WORKER_QUEUES.DOCX_IMPORTS },
      { name: WORKER_QUEUES.EXPORTS },
      { name: WORKER_QUEUES.TASK_REMINDERS },
      { name: WORKER_QUEUES.DOCX_IMPORTS_DLQ },
      { name: WORKER_QUEUES.EXPORTS_DLQ },
      { name: WORKER_QUEUES.TASK_REMINDERS_DLQ },
    ),
  ],
  providers: [
    DocxImportProcessor,
    ExportProcessor,
    TaskRemindersProcessor,
    LibreOfficeService,
    DocxParserService,
    TipTapTransformerService,
    StorageService,
    EmailBootstrapService,
    TaskReminderSchedulerService,
  ],
})
export class WorkerModule {}
