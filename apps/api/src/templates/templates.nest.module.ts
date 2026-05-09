import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { TemplatesNestController } from "./templates.nest.controller.js";
import { TemplatesService } from "./templates.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [TemplatesNestController],
  providers: [TemplatesService],
})
export class TemplatesNestModule {}
