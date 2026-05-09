import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { InvitationsNestController } from "./invitations.nest.controller.js";
import { InvitationsService } from "./invitations.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [InvitationsNestController],
  providers: [InvitationsService],
})
export class InvitationsNestModule {}
