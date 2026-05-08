import { Module } from "@nestjs/common";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { AuthAppService } from "./auth.app.service.js";
import { AuthNestController } from "./auth.nest.controller.js";

@Module({
  controllers: [AuthNestController],
  providers: [PrismaClientProvider, AuthAppService],
})
export class AuthNestModule {}
