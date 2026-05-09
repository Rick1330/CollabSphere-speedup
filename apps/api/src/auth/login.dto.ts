import { ValidationAppError } from "../common/filters/app-error.filter.js";

export type LoginInput = {
  email: string;
  password: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLoginInput = (raw: unknown): LoginInput => {
  if (!raw || typeof raw !== "object") {
    throw new ValidationAppError({
      message: "Login payload is required.",
      issues: [{ field: "body", rule: "required", message: "Login payload is required." }],
    });
  }

  const body = raw as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !emailPattern.test(email)) {
    throw new ValidationAppError({
      message: "Valid email is required.",
      issues: [{ field: "email", rule: "format", message: "Valid email is required." }],
    });
  }

  if (password.length < 8) {
    throw new ValidationAppError({
      message: "Password is required.",
      issues: [{ field: "password", rule: "min", message: "Password must be at least 8 characters." }],
    });
  }

  return { email, password };
};
