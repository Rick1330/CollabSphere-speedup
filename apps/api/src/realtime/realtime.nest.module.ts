import { Global, Module } from "@nestjs/common";
import { AuthNestModule } from "../auth/auth.nest.module.js";
import { PrismaModule } from "../common/prisma/prisma.module.js";
import { RealtimeGateway } from "./realtime.gateway.js";
import { RealtimeEventsService } from "./realtime-events.service.js";
import { RealtimeListener } from "./realtime.listener.js";
import { RealtimeSessionService } from "./realtime-session.service.js";

@Global()
@Module({
  imports: [AuthNestModule, PrismaModule],
  providers: [RealtimeGateway, RealtimeEventsService, RealtimeSessionService, RealtimeListener],
  exports: [RealtimeGateway, RealtimeEventsService, RealtimeSessionService],
})
export class RealtimeNestModule {}
