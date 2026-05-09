import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { WorkspacesNestController } from "./workspaces.nest.controller.js";
import { WorkspacesService } from "./workspaces.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [WorkspacesNestController],
  providers: [WorkspacesService],
})
export class WorkspacesNestModule {}
