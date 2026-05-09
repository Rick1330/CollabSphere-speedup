import { Inject, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { apiRuntimeEnv } from "../config/api-runtime.js";

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        globalRole: true,
        themePreference: true,
        isVerified: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new AppError({ code: "NOT_FOUND", message: "User not found" });
    }
    return { user };
  }

  async updateMe(
    userId: string,
    input: { fullName?: string; bio?: string | null; themePreference?: string; avatarUrl?: string | null },
  ) {
    const data: Record<string, unknown> = {};
    if (input.fullName !== undefined) {
      const name = input.fullName.trim();
      if (name.length < 1 || name.length > 200) {
        throw new ValidationAppError({
          message: "fullName must be 1–200 characters.",
          issues: [{ field: "fullName", rule: "length", message: "fullName must be 1–200 characters." }],
        });
      }
      data.fullName = name;
    }
    if (input.bio !== undefined) {
      const bio = input.bio === null ? null : String(input.bio).trim();
      if (bio !== null && bio.length > 500) {
        throw new ValidationAppError({
          message: "bio is too long.",
          issues: [{ field: "bio", rule: "max_length", message: "bio is too long." }],
        });
      }
      data.bio = bio;
    }
    if (input.themePreference !== undefined) {
      const t = String(input.themePreference).trim();
      if (!["light", "dark", "system"].includes(t)) {
        throw new ValidationAppError({
          message: "themePreference is invalid.",
          issues: [{ field: "themePreference", rule: "enum", message: "themePreference is invalid." }],
        });
      }
      data.themePreference = t;
    }
    if (input.avatarUrl !== undefined) {
      data.avatarUrl = input.avatarUrl === null ? null : String(input.avatarUrl).trim().slice(0, 500);
    }
    if (Object.keys(data).length === 0) {
      return this.getMe(userId);
    }
    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.getMe(userId);
  }

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
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
    if (input.newPassword.length < 8) {
      throw new ValidationAppError({
        message: "New password must be at least 8 characters.",
        issues: [
          { field: "newPassword", rule: "min", message: "New password must be at least 8 characters." },
        ],
      });
    }
    const passwordHash = await bcrypt.hash(input.newPassword, apiRuntimeEnv.BCRYPT_COST);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: "Password updated. Please sign in again on other devices." };
  }
}
