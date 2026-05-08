import { AppError } from "../filters/app-error.filter.js";

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
