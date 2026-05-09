import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { DocumentsNestController } from "./documents.nest.controller.js";
import { DocumentsService } from "./documents.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsNestController],
  providers: [DocumentsService],
})
export class DocumentsNestModule {}
