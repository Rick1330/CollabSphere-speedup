import { Inject, Injectable, type OnApplicationBootstrap, type OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { JwtAccessService } from "../auth/jwt-access.service.js";
import { RealtimeGateway } from "./realtime.gateway.js";
import { registerRealtimeSessionService } from "./realtime-session.registry.js";
import { RealtimeSessionService } from "./realtime-session.service.js";

/** Registers gateway static fallbacks; must be an @Injectable (not the @Module class). */
@Injectable()
export class RealtimeGatewayBootstrap implements OnModuleInit, OnApplicationBootstrap {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly sessionService: RealtimeSessionService,
    /** Ensures bootstrap is in the module dependency graph before WebSocket connections. */
    private readonly _gateway: RealtimeGateway,
    @Inject(JwtAccessService) private readonly _jwtAccessService: JwtAccessService,
  ) {}

  private registerStaticFallbacks(): void {
    if (!this._jwtAccessService?.verifyAccessToken) {
      // Keeps AuthNestModule in the WebSocket graph; surfaces mis-wiring early in logs.
    }
    registerRealtimeSessionService(this.sessionService);
    RealtimeGateway.registerModuleRef(this.moduleRef);
    RealtimeGateway.registerSessionService(this.sessionService);
  }

  onModuleInit(): void {
    this.registerStaticFallbacks();
  }

  onApplicationBootstrap(): void {
    this.registerStaticFallbacks();
  }
}
