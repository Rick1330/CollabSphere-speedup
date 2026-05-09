import { Module } from "@nestjs/common";
import { NotificationsNestController } from "./notifications.nest.controller.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  controllers: [NotificationsNestController],
  providers: [NotificationsService],
})
export class NotificationsNestModule {}
