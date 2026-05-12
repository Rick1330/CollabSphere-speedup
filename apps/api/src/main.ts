import "reflect-metadata";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { HttpSuccessStatusInterceptor } from "./common/nest/http-success-status.interceptor.js";
import { NestAppErrorFilter } from "./common/nest/nest-app-error.filter.js";
import { RedisIoAdapter } from "./realtime/redis-io.adapter.js";
import { apiRuntimeEnv } from "./config/api-runtime.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });
  app.use(cookieParser());
  /**
   * Local dev serves the SPA on :8080 and the API on :3001. The web app may
   * call the API cross-origin while using credentialed cookies; enable permissive
   * CORS in non-production only (see apps/web browser dev API base URL).
   */
  if ((process.env.NODE_ENV ?? "development") !== "production") {
    app.enableCors({ origin: true, credentials: true });
  }
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

  const port = Number.parseInt(process.env.PORT ?? "3001", 10) || 3001;
  await app.listen(port);
}

void bootstrap();
