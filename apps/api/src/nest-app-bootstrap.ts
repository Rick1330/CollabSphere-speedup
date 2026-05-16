import "reflect-metadata";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { HttpSuccessStatusInterceptor } from "./common/nest/http-success-status.interceptor.js";
import { NestAppErrorFilter } from "./common/nest/nest-app-error.filter.js";
import { RedisIoAdapter } from "./realtime/redis-io.adapter.js";
import { apiRuntimeEnv } from "./config/api-runtime.js";
import { setDevNestAppRef } from "./dev/dev.nest.controller.js";

function parseCorsOrigins(raw: string | undefined): string[] | true {
  const trimmed = raw?.trim();
  if (!trimmed) return true;
  const origins = trimmed
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return origins.length > 0 ? origins : true;
}

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  app.use(helmet());
  app.use(cookieParser());

  const isProduction = (process.env.NODE_ENV ?? "development") === "production";
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  app.enableCors({
    origin: isProduction
      ? corsOrigins === true
        ? [process.env.FRONTEND_URL || "https://app.collabsphere.com"]
        : corsOrigins
      : corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new NestAppErrorFilter());
  app.useGlobalInterceptors(new HttpSuccessStatusInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: false,
    }),
  );
  const redisIoAdapter = new RedisIoAdapter(app, apiRuntimeEnv.REDIS_URL);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);
  setDevNestAppRef(app);

  return app;
}

export async function listenNestApp(app: INestApplication): Promise<void> {
  const port = Number.parseInt(process.env.PORT ?? "3001", 10) || 3001;
  const host = (process.env.HOST ?? "0.0.0.0").trim() || "0.0.0.0";
  await app.listen(port, host);

  const server = app.getHttpServer();
  const stack = server?._events?.request?._router?.stack ?? [];
  const routeCount = stack.filter((layer: { route?: { path?: string } }) => layer?.route?.path).length;
  const hasWorkspacesPost = stack.some(
    (layer: { route?: { path?: string; methods?: Record<string, boolean> } }) =>
      layer?.route?.path === "/workspaces" && layer.route.methods?.post,
  );
  console.log(
    `[api] listening on http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port} (prefix api/v1, ~${routeCount} routes, POST /workspaces=${hasWorkspacesPost ? "yes" : "NO"})`,
  );
  console.log(`[api] health: http://127.0.0.1:${port}/api/v1/health`);
  if ((process.env.NODE_ENV ?? "development") !== "production") {
    console.log(`[api] dev routes: http://127.0.0.1:${port}/api/v1/dev/routes`);
  }
}
