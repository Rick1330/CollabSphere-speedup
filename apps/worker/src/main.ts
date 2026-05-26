import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { EnvValidationError, parseRuntimeEnv } from "../../../packages/shared/src/runtime-env.js";
import { validateServiceEnv } from "../../../packages/shared/src/bootstrap-runtime.js";
import { WorkerModule } from "./worker.module.js";

const logger = new Logger("WorkerServer");

async function bootstrap() {
  validateServiceEnv({
    service: "worker",
    parser: parseRuntimeEnv,
    validationErrorClass: EnvValidationError,
  });

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "error", "warn"],
  });

  app.enableShutdownHooks();
  logger.log("Worker server is running (BullMQ processors active)");
}

bootstrap().catch((error) => {
  logger.error("Worker bootstrap failed", error);
  process.exit(1);
});
