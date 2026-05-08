import { Module } from "@nestjs/common";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { WorkspacesNestController } from "./workspaces.nest.controller.js";
import { WorkspacesService } from "./workspaces.service.js";

@Module({
  controllers: [WorkspacesNestController],
  providers: [PrismaClientProvider, WorkspacesService],
})
export class WorkspacesNestModule {}
