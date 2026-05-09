import { ValidationAppError } from "../common/filters/app-error.filter.js";

export type ResendVerificationInput = {
  email: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateResendVerificationInput = (raw: unknown): ResendVerificationInput => {
  if (!raw || typeof raw !== "object") {
    throw new ValidationAppError({
      message: "Payload is required.",
      issues: [{ field: "body", rule: "required", message: "Payload is required." }],
    });
  }
  const body = raw as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !emailPattern.test(email)) {
    throw new ValidationAppError({
      message: "Valid email is required.",
      issues: [{ field: "email", rule: "format", message: "Valid email is required." }],
    });
  }
  return { email };
};
