import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { WorkspacesNestController } from "./workspaces.nest.controller.js";
import { WorkspacesService } from "./workspaces.service.js";

@Module({
  imports: [PrismaModule, EventEmitterModule],
  controllers: [WorkspacesNestController],
  providers: [WorkspacesService],
})
export class WorkspacesNestModule {}
