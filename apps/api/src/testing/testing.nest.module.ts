import { Module } from "@nestjs/common";
import { TestingNestController } from "./testing.nest.controller.js";

@Module({
  controllers: [TestingNestController],
})
export class TestingNestModule {}
