import { Module } from "@nestjs/common";
import { DevNestController } from "./dev.nest.controller.js";

@Module({
  controllers: [DevNestController],
})
export class DevNestModule {}
