import "reflect-metadata";
import cookieParser from "cookie-parser";
import helmet from "helmet";
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

  // Security Hardening
  app.use(helmet());
  app.use(cookieParser());

  /**
   * Production-grade CORS configuration
   */
  const isProduction = (process.env.NODE_ENV ?? "development") === "production";
  app.enableCors({
    origin: isProduction
      ? [process.env.FRONTEND_URL || "https://app.collabsphere.com"]
      : true,
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

  const port = Number.parseInt(process.env.PORT ?? "3001", 10) || 3001;
  await app.listen(port);
}

void bootstrap();
