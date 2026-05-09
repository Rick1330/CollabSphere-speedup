import { Module } from "@nestjs/common";
import { CommentsNestController } from "./comments.nest.controller.js";
import { CommentsService } from "./comments.service.js";

@Module({
  controllers: [CommentsNestController],
  providers: [CommentsService],
})
export class CommentsNestModule {}
