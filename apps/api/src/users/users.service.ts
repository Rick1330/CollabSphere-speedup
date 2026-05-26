import { Inject, Injectable } from "@nestjs/common";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { apiRuntimeEnv } from "../config/api-runtime.js";
import { executePasswordChange } from "./change-password.logic.js";
import {
  normalizeRecentColors,
  type EditorPreferencesJson,
} from "./editor-preferences.util.js";

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

  async getEditorPreferences(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { editorPreferences: true },
    });
    if (!user) {
      throw new AppError({ code: "NOT_FOUND", message: "User not found" });
    }
    const prefs = (user.editorPreferences as EditorPreferencesJson | null) ?? {};
    return { recentColors: normalizeRecentColors(prefs.recentColors) };
  }

  async updateEditorPreferences(userId: string, input: { recentColors: string[] }) {
    const recentColors = normalizeRecentColors(input.recentColors);
    await this.prisma.user.update({
      where: { id: userId },
      data: { editorPreferences: { recentColors } satisfies EditorPreferencesJson },
    });
    return { recentColors };
  }

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    return executePasswordChange(
      {
        bcryptCost: apiRuntimeEnv.BCRYPT_COST,
        findUser: async (id) =>
          this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: { passwordHash: true },
          }),
        updatePasswordHash: async (id, passwordHash) => {
          await this.prisma.user.update({
            where: { id },
            data: {
              passwordHash,
              passwordChangedAt: new Date(),
            },
          });
        },
        revokeRefreshTokens: async (id) => {
          await this.prisma.refreshToken.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        },
      },
      userId,
      input,
    );
  }
}
