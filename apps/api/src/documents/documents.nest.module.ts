import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { DocumentsNestController } from "./documents.nest.controller.js";
import { DocumentsService } from "./documents.service.js";

@Module({
  imports: [PrismaModule, EventEmitterModule],
  controllers: [DocumentsNestController],
  providers: [DocumentsService],
})
export class DocumentsNestModule {}
