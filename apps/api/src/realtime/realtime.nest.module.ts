import { Global, Module } from "@nestjs/common";
import { AuthNestModule } from "../auth/auth.nest.module.js";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { RealtimeGateway } from "./realtime.gateway.js";
import { RealtimeEventsService } from "./realtime-events.service.js";
import { RealtimeSessionService } from "./realtime-session.service.js";

@Global()
@Module({
  imports: [AuthNestModule, PrismaModule],
  providers: [RealtimeGateway, RealtimeEventsService, RealtimeSessionService],
  exports: [RealtimeGateway, RealtimeEventsService, RealtimeSessionService],
})
export class RealtimeNestModule {}
