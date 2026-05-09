import { Module } from "@nestjs/common";
import { AdminNestController } from "./admin.nest.controller.js";
import { AdminService } from "./admin.service.js";

@Module({
  controllers: [AdminNestController],
  providers: [AdminService],
})
export class AdminNestModule {}
