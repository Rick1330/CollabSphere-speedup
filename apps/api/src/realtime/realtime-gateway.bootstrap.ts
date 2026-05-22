import { Injectable, type OnApplicationBootstrap, type OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
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
  ) {}

  private registerStaticFallbacks(): void {
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
