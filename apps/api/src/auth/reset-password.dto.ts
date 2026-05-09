import { ValidationAppError } from "../common/filters/app-error.filter.js";

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export const validateResetPasswordInput = (raw: unknown): ResetPasswordInput => {
  if (!raw || typeof raw !== "object") {
    throw new ValidationAppError({
      message: "Payload is required.",
      issues: [{ field: "body", rule: "required", message: "Payload is required." }],
    });
  }
  const body = raw as Record<string, unknown>;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token) {
    throw new ValidationAppError({
      message: "Token is required.",
      issues: [{ field: "token", rule: "required", message: "Token is required." }],
    });
  }
  if (password.length < 8) {
    throw new ValidationAppError({
      message: "Password must be at least 8 characters.",
      issues: [{ field: "password", rule: "min", message: "Password must be at least 8 characters." }],
    });
  }
  return { token, password };
};
