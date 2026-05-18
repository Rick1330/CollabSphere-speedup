import Joi from "joi";

const minSecretLength = 32;

const hasConfiguredValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test", "provision", "local", "staging")
    .default("development"),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(minSecretLength).required(),
  JWT_ACCESS_TTL_MINUTES: Joi.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().default(7),
  COLLAB_JWT_SECRET: Joi.string().min(minSecretLength).required(),
  CORS_ORIGINS: Joi.string().required(),
  BASE_URL: Joi.string().uri().required(),
  API_BASE_URL: Joi.string().uri().optional(),
  EMAIL_PROVIDER_API_KEY: Joi.string().optional(),
  EMAIL_SMTP_HOST: Joi.string().optional(),
  EMAIL_SMTP_PORT: Joi.number().optional(),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
})
  .unknown(true)
  .custom((value, helpers) => {
    const hasSmtpHost = hasConfiguredValue(value.EMAIL_SMTP_HOST);
    const hasSmtpPort = value.EMAIL_SMTP_PORT !== undefined && value.EMAIL_SMTP_PORT !== null;
    const hasProvider = hasConfiguredValue(value.EMAIL_PROVIDER_API_KEY);

    if (hasSmtpHost !== hasSmtpPort) {
      return helpers.error("any.custom", {
        message: "EMAIL_SMTP_HOST and EMAIL_SMTP_PORT must be set together for local SMTP.",
      });
    }

    if (!hasSmtpHost && !hasProvider) {
      return helpers.error("any.custom", {
        message: "EMAIL_PROVIDER_API_KEY is required when local SMTP is not configured.",
      });
    }

    const hasGoogleId = hasConfiguredValue(value.GOOGLE_CLIENT_ID);
    const hasGoogleSecret = hasConfiguredValue(value.GOOGLE_CLIENT_SECRET);

    if (hasGoogleId !== hasGoogleSecret) {
      return helpers.error("any.custom", {
        message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together.",
      });
    }

    return value;
  });
