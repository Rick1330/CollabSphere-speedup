import { Module } from "@nestjs/common";
import { EnvValidationError, parseApiRuntimeEnv } from "../../../../packages/shared/src/api-env.js";
import { validateServiceEnv } from "../../../../packages/shared/src/bootstrap-runtime.js";
import { HealthService } from "./health.service.js";
import { HealthNestController } from "./health.nest.controller.js";

const apiEnv = validateServiceEnv({
  service: "api",
  parser: parseApiRuntimeEnv,
  validationErrorClass: EnvValidationError,
});

@Module({
  controllers: [HealthNestController],
  providers: [
    {
      provide: HealthService,
      useFactory: () => new HealthService(apiEnv.DATABASE_URL, apiEnv.REDIS_URL),
    },
  ],
  exports: [HealthService],
})
export class HealthNestModule {}
