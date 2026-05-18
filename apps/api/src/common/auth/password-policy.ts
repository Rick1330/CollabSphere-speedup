import { AppError } from "../filters/app-error.filter.js";

const minPasswordLength = 8;
const maxPasswordLength = 72;

/** Matches registration and settings password rules. */
export function assertPasswordStrength(password: string): void {
  const passwordByteLength = Buffer.byteLength(password, "utf8");
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordLengthValid =
    password.length >= minPasswordLength && passwordByteLength <= maxPasswordLength;
  const hasRequiredCharacterSets = hasUpper && hasLower && hasDigit && hasSpecial;

  if (!isPasswordLengthValid || !hasRequiredCharacterSets) {
    throw new AppError({
      code: "PASSWORD_TOO_WEAK",
      message: "Password does not meet complexity requirements",
    });
  }
}
