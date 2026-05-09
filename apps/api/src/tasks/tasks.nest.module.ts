import { Module } from "@nestjs/common";
import { RealtimeNestModule } from "../realtime/realtime.nest.module.js";
import { TasksNestController } from "./tasks.nest.controller.js";
import { TasksService } from "./tasks.service.js";

@Module({
  imports: [RealtimeNestModule],
  controllers: [TasksNestController],
  providers: [TasksService],
})
export class TasksNestModule {}
