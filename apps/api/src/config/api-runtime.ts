import { EnvValidationError, parseApiRuntimeEnv } from "../../../../packages/shared/src/api-env.js";
import { validateServiceEnv } from "../../../../packages/shared/src/bootstrap-runtime.js";

/** Validated API process env (single load per process). */
export const apiRuntimeEnv = validateServiceEnv({
  service: "api",
  parser: parseApiRuntimeEnv,
  validationErrorClass: EnvValidationError,
});
