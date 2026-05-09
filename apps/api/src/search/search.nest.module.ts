import { Module } from "@nestjs/common";
import { SearchNestController } from "./search.nest.controller.js";
import { SearchService } from "./search.service.js";

@Module({
  controllers: [SearchNestController],
  providers: [SearchService],
})
export class SearchNestModule {}
