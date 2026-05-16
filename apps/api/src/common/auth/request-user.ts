import { AppError } from "../filters/app-error.filter.js";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** RFC 4122-style UUID (used for auth-related ids). */
export const isValidUuid = (value: string) => uuidRe.test(value);

/** Hex UUID shape accepted by Postgres `@db.Uuid` (avoids Prisma raw DB errors on route params). */
const postgresUuidParamRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isDatabaseUuidParam = (value: string) => postgresUuidParamRe.test(value.trim());

export const resolveRequestUserId = (headerValue: unknown): string => {
  if (typeof headerValue !== "string") {
    throw new AppError({
      code: "UNAUTHORIZED",
      message: "Missing authentication context.",
    });
  }

  const normalized = headerValue.trim();
  if (!normalized) {
    throw new AppError({
      code: "UNAUTHORIZED",
      message: "Missing authentication context.",
    });
  }

  return normalized;
};
