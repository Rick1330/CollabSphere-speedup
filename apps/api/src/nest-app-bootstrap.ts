import "reflect-metadata";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { HttpException, ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { TransformInterceptor } from "./common/nest/transform.interceptor.js";
import { HttpSuccessStatusInterceptor } from "./common/nest/http-success-status.interceptor.js";
import { NestAppErrorFilter } from "./common/nest/nest-app-error.filter.js";
import { createValidationPipeExceptionFactory } from "./common/nest/validation-pipe.util.js";
import { RedisIoAdapter } from "./realtime/redis-io.adapter.js";
import { apiRuntimeEnv } from "./config/api-runtime.js";
import { setDevNestAppRef } from "./dev/dev.nest.controller.js";
import {
  corsAllowedHeaders,
  corsAllowedMethods,
  parseCorsOrigins,
} from "./common/cors/cors-origins.util.js";
import { devCorsPreflightMiddleware } from "./common/middleware/dev-cors-preflight.middleware.js";
import { corsResponseMiddleware } from "./common/middleware/cors-response.middleware.js";

export { parseCorsOrigins };

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  app.use(devCorsPreflightMiddleware);
  app.use(corsResponseMiddleware);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());

  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  if (corsOrigins.length === 0) {
    throw new HttpException("CORS_ORIGINS must include at least one origin.", 500);
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: [...corsAllowedMethods],
    allowedHeaders: [...corsAllowedHeaders],
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new NestAppErrorFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new HttpSuccessStatusInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: createValidationPipeExceptionFactory(),
    }),
  );
  if (process.env.SKIP_REDIS_IO_ADAPTER !== "1") {
    const redisIoAdapter = new RedisIoAdapter(app, apiRuntimeEnv.REDIS_URL);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
  }
  setDevNestAppRef(app);

  return app;
}

export async function listenNestApp(app: INestApplication): Promise<void> {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const corsFromEnv = (process.env.CORS_ORIGINS ?? "").trim();
  if (nodeEnv !== "production" && !corsFromEnv) {
    console.error(
      "[api] CORS_ORIGINS is empty. Set CORS_ORIGINS in .env (e.g. http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:3001) and restart pnpm dev.",
    );
    process.exit(1);
  }

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
  console.log(`bootstrap listening on http://127.0.0.1:${port}/api/v1/health`);
  if (nodeEnv !== "production") {
    console.log(`[api] dev routes: http://127.0.0.1:${port}/api/v1/dev/routes`);
    const corsLogged = corsFromEnv
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    console.log(`[api] CORS_ORIGINS (${corsLogged.length}): ${corsLogged.join(" | ") || "(none)"}`);
  }

  const apiBase = apiRuntimeEnv.API_BASE_URL?.trim();
  if (apiBase) {
    let apiBasePort: number | null = null;
    try {
      const parsed = new URL(apiBase);
      apiBasePort =
        parsed.port.length > 0
          ? Number.parseInt(parsed.port, 10)
          : parsed.protocol === "https:"
            ? 443
            : 80;
    } catch {
      console.error(`[api] API_BASE_URL is not a valid URL: ${apiBase}`);
    }

    console.log(`[api] API_BASE_URL=${apiBase}`);
    if (apiBasePort !== null && apiBasePort !== port) {
      console.error(
        `[api] misconfiguration: listening on port ${port} but API_BASE_URL uses port ${apiBasePort}. OAuth and redirects will fail until PORT and API_BASE_URL match.`,
      );
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (googleClientId) {
      const oauthCallback = `${apiBase.replace(/\/+$/, "")}/api/v1/auth/google/callback`;
      console.log(`[api] Google OAuth callback (register in Google Cloud Console): ${oauthCallback}`);
    }
  }
}
