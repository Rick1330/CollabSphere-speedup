import type { INestApplication } from "@nestjs/common";
import type { RealtimeSessionService } from "./realtime-session.service.js";

/** Survives duplicate ESM module instances and Nest WebSocket proxy classes. */
const GLOBAL_SESSION_KEY = Symbol.for("collabsphere.RealtimeSessionService");
const GLOBAL_APP_KEY = Symbol.for("collabsphere.NestApplication");

type GlobalRegistry = typeof globalThis & {
  [GLOBAL_SESSION_KEY]?: RealtimeSessionService;
  [GLOBAL_APP_KEY]?: INestApplication;
};

export function registerNestApplication(app: INestApplication): void {
  (globalThis as GlobalRegistry)[GLOBAL_APP_KEY] = app;
}

export function getNestApplication(): INestApplication | null {
  return (globalThis as GlobalRegistry)[GLOBAL_APP_KEY] ?? null;
}

export function registerRealtimeSessionService(sessionService: RealtimeSessionService): void {
  (globalThis as GlobalRegistry)[GLOBAL_SESSION_KEY] = sessionService;
}

export function getRegisteredRealtimeSessionService(): RealtimeSessionService | null {
  return (globalThis as GlobalRegistry)[GLOBAL_SESSION_KEY] ?? null;
}
