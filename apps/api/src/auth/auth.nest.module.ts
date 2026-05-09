import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { AuthAppService } from "./auth.app.service.js";
import { AuthNestController } from "./auth.nest.controller.js";
import { AuthSessionService } from "./auth-session.service.js";
import { GoogleOAuthService } from "./google-oauth.service.js";
import { JwtAccessService } from "./jwt-access.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [AuthNestController],
  providers: [JwtAccessService, AuthSessionService, GoogleOAuthService, AuthAppService],
  exports: [JwtAccessService],
})
export class AuthNestModule {}
