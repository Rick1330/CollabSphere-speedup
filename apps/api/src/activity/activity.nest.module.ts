import { Module } from "@nestjs/common";
import { ActivityNestController } from "./activity.nest.controller.js";
import { ActivityService } from "./activity.service.js";

@Module({
  controllers: [ActivityNestController],
  providers: [ActivityService],
})
export class ActivityNestModule {}
