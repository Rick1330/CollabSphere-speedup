import { AppError } from "../filters/app-error.filter.js";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUuid = (value: string) => uuidRe.test(value);

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
