import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { Queues } from "@collabsphere/shared/jobs";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { ExportsNestController } from "./exports.nest.controller.js";
import { ExportsService } from "./exports.service.js";

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: Queues.EXPORT }),
  ],
  controllers: [ExportsNestController],
  providers: [ExportsService],
  exports: [ExportsService],
})
export class ExportsNestModule {}
