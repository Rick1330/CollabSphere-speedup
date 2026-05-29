import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { Queues } from "@collabsphere/shared/jobs";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { ExportsNestModule } from "../exports/exports.nest.module.js";
import { DocumentSubmissionsNestController } from "./document-submissions.nest.controller.js";
import { DocumentsNestController } from "./documents.nest.controller.js";
import { DocxImportService } from "./docx-import.service.js";
import { DocumentImagesService } from "./document-images.service.js";
import { DocumentsService } from "./documents.service.js";

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule,
    ExportsNestModule,
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
  controllers: [DocumentsNestController, DocumentSubmissionsNestController],
  providers: [DocumentsService, DocxImportService, DocumentImagesService],
})
export class DocumentsNestModule {}
