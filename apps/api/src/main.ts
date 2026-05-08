import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { EnvValidationError, parseApiRuntimeEnv } from "../../../packages/shared/src/api-env.js";
import { validateServiceEnv } from "../../../packages/shared/src/bootstrap-runtime.js";

const apiEnv = validateServiceEnv({
  service: "api",
  parser: parseApiRuntimeEnv,
  validationErrorClass: EnvValidationError,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: false,
    }),
  );

  const port = Number.parseInt(process.env.PORT ?? "3001", 10) || 3001;
  await app.listen(port);
}

void bootstrap();
