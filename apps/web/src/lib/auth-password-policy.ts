import { z } from "zod";

/** Shared new-password rules for registration and settings. */
export const newPasswordZodSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[a-z]/, "Needs lowercase")
  .regex(/[A-Z]/, "Needs uppercase")
  .regex(/\d/, "Needs a number")
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Needs special character");
