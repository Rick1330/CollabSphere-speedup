import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { Queues } from "@collabsphere/shared/jobs";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { DocumentsNestController } from "./documents.nest.controller.js";
import { DocxImportService } from "./docx-import.service.js";
import { DocumentsService } from "./documents.service.js";

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({ name: Queues.DOCX_IMPORT }),
  ],
  controllers: [DocumentsNestController],
  providers: [DocumentsService, DocxImportService],
})
export class DocumentsNestModule {}
