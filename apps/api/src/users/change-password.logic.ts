import bcrypt from "bcryptjs";
import { assertPasswordStrength } from "../common/auth/password-policy.js";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";

export type ChangePasswordDeps = {
  bcryptCost: number;
  findUser: (userId: string) => Promise<{ passwordHash: string | null } | null>;
  updatePasswordHash: (userId: string, passwordHash: string) => Promise<void>;
  revokeRefreshTokens: (userId: string) => Promise<void>;
};

export async function executePasswordChange(
  deps: ChangePasswordDeps,
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<{ message: string }> {
  const user = await deps.findUser(userId);
  if (!user?.passwordHash) {
    throw new AppError({
      code: "OAUTH_USER_NO_PASSWORD",
      message: "Password change is not available for this account.",
    });
  }
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) {
    throw new AppError({ code: "INVALID_CREDENTIALS", message: "Current password is incorrect." });
  }
  if (input.currentPassword === input.newPassword) {
    throw new AppError({
      code: "PASSWORD_SAME_AS_CURRENT",
      message: "New password must differ from current password.",
    });
  }
  try {
    assertPasswordStrength(input.newPassword);
  } catch (error) {
    if (error instanceof AppError && error.code === "PASSWORD_TOO_WEAK") {
      throw new ValidationAppError({
        message: error.message,
        issues: [
          {
            field: "newPassword",
            rule: "password_strength",
            message: "Password does not meet complexity requirements.",
          },
        ],
      });
    }
    throw error;
  }
  const passwordHash = await bcrypt.hash(input.newPassword, deps.bcryptCost);
  await deps.updatePasswordHash(userId, passwordHash);
  await deps.revokeRefreshTokens(userId);
  return { message: "Password updated. Please sign in again on other devices." };
}
