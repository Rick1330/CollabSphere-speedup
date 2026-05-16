import Joi from "joi";

/**
 * Minimal Nest `ConfigModule` validation. Full API env (JWT, CORS, email, etc.) is
 * validated at process load by `parseApiRuntimeEnv` in `api-runtime.ts` (`packages/shared`).
 *
 * Do not require legacy keys like `JWT_SECRET` / `SESSION_SECRET` here — they are not
 * part of the current `.env.example` contract and will prevent the API from booting.
 */
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test", "provision")
    .default("development"),
  /** Must stay aligned with `apps/api/src/dev.ts` (`PORT ?? "3001"`). */
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
}).unknown(true);
