import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { FoldersNestController } from "./folders.nest.controller.js";
import { FoldersService } from "./folders.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [FoldersNestController],
  providers: [FoldersService],
})
export class FoldersNestModule {}
