import { Module } from "@nestjs/common";
import { DocumentsNestController } from "./documents.nest.controller.js";
import { DocumentsService } from "./documents.service.js";

@Module({
  controllers: [DocumentsNestController],
  providers: [DocumentsService],
})
export class DocumentsNestModule {}
