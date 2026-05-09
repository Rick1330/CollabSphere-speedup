import { Module } from "@nestjs/common";
import { ExportsNestController } from "./exports.nest.controller.js";
import { ExportsService } from "./exports.service.js";

@Module({
  controllers: [ExportsNestController],
  providers: [ExportsService],
})
export class ExportsNestModule {}
