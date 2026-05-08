import { Module } from "@nestjs/common";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { InvitationsNestController } from "./invitations.nest.controller.js";
import { InvitationsService } from "./invitations.service.js";

@Module({
  controllers: [InvitationsNestController],
  providers: [PrismaClientProvider, InvitationsService],
})
export class InvitationsNestModule {}
