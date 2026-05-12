import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { apiRuntimeEnv } from "../config/api-runtime.js";
import { JwtAccessService } from "./jwt-access.service.js";
import {
  createVerificationEmailJob,
  encryptVerificationToken,
  enqueueVerificationEmailJob,
} from "./verification-email-queue.js";

const hashSha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const createOpaqueToken = () => randomBytes(32).toString("base64url");
const textEncoder = new TextEncoder();

const verificationTokenTtlMs = 24 * 60 * 60 * 1000;
const passwordResetTtlMs = 60 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  globalRole: string;
  isVerified: boolean;
  authProvider: string;
};

@Injectable()
export class AuthSessionService {
  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    @Inject(JwtAccessService) private readonly jwtAccess: JwtAccessService,
  ) {}

  private refreshTtlMs() {
    return apiRuntimeEnv.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  private async appendSessionAuditLog(input: {
    actionKey: string;
    severity?: "info" | "warn" | "error";
    actorId?: string | null;
    actorEmail?: string | null;
    actorGlobalRole?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          severity: input.severity ?? "info",
          actionKey: input.actionKey,
          actorId: input.actorId ?? null,
          actorEmail: input.actorEmail ?? null,
          actorGlobalRole: input.actorGlobalRole ?? null,
          workspaceId: null,
          targetType: "session",
          targetId: input.actorId ?? null,
          ipAddress: input.ipAddress?.slice(0, 64) ?? null,
          userAgent: input.userAgent ?? null,
          metadata: (input.metadata ?? {}) as never,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[api] failed to append auth session audit log: ${message}`);
    }
  }

  async issueCollabToken(input: {
    userId: string;
    workspaceId: string;
    documentId: string;
  }): Promise<{ token: string; expiresInSeconds: number }> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        isActive: true,
        deletedAt: null,
      },
      select: { role: true },
    });
    if (!membership) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }

    const document = await this.prisma.document.findFirst({
      where: {
        id: input.documentId,
        workspaceId: input.workspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!document) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }

    const secret = process.env.COLLAB_JWT_SECRET?.trim();
    if (!secret) {
      throw new AppError({
        code: "SERVICE_UNAVAILABLE",
        message: "Collaboration signing secret is not configured.",
      });
    }

    const expiresInSeconds = 5 * 60;
    const token = await new SignJWT({
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      role: membership.role,
      scope: "collab",
      userId: input.userId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(input.userId)
      .setIssuedAt()
      .setExpirationTime(`${expiresInSeconds}s`)
      .sign(textEncoder.encode(secret));

    return { token, expiresInSeconds };
  }

  private async issueTokensForUser(input: {
    user: {
      id: string;
      email: string;
      globalRole: string;
    };
    ipAddress: string;
    userAgent: string;
  }) {
    const accessToken = await this.jwtAccess.signAccessToken({
      sub: input.user.id,
      email: input.user.email,
      globalRole: input.user.globalRole,
    });
    const refreshRaw = createOpaqueToken();
    const refreshHash = hashSha256(refreshRaw);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());
    await this.prisma.refreshToken.create({
      data: {
        userId: input.user.id,
        tokenHash: refreshHash,
        expiresAt,
        ipAddress: input.ipAddress.slice(0, 64),
        userAgent: input.userAgent,
      },
    });
    return { accessToken, refreshToken: refreshRaw };
  }

  async login(input: {
    email: string;
    password: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: SessionUser }> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: input.email,
        deletedAt: null,
      },
    });
    if (!user) {
      throw new AppError({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }
    if (!user.isActive) {
      throw new AppError({
        code: "ACCOUNT_DEACTIVATED",
        message: "This account has been deactivated.",
      });
    }
    if (user.authProvider === "google" && !user.passwordHash) {
      throw new AppError({
        code: "OAUTH_USER_NO_PASSWORD",
        message: "This account uses Google sign-in.",
      });
    }
    if (!user.passwordHash) {
      throw new AppError({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new AppError({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }
    if (!user.isVerified) {
      throw new AppError({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before signing in.",
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokensForUser({
      user: {
        id: user.id,
        email: user.email,
        globalRole: user.globalRole,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
    await this.appendSessionAuditLog({
      actionKey: "auth.login",
      actorId: user.id,
      actorEmail: user.email,
      actorGlobalRole: user.globalRole,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        globalRole: user.globalRole,
        isVerified: user.isVerified,
        authProvider: user.authProvider,
      },
    };
  }

  async refreshSession(input: {
    refreshToken: string | undefined;
    ipAddress: string;
    userAgent: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const raw = input.refreshToken?.trim();
    if (!raw) {
      throw new AppError({
        code: "REFRESH_TOKEN_MISSING",
        message: "Refresh token cookie is required",
      });
    }
    const hash = hashSha256(raw);
    const existing = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hash,
      },
      include: {
        user: true,
      },
    });
    if (!existing || !existing.user || existing.expiresAt.getTime() <= Date.now()) {
      throw new AppError({
        code: "REFRESH_TOKEN_INVALID",
        message: "Refresh token is invalid or expired",
      });
    }
    if (existing.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId: existing.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      await this.appendSessionAuditLog({
        actionKey: "auth.refresh.replay_detected",
        severity: "warn",
        actorId: existing.user.id,
        actorEmail: existing.user.email,
        actorGlobalRole: existing.user.globalRole,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: {
          compromisedTokenId: existing.id,
        },
      });
      throw new AppError({
        code: "REFRESH_TOKEN_INVALID",
        message: "Refresh token replay detected",
      });
    }
    if (!existing.user.isActive || existing.user.deletedAt) {
      throw new AppError({
        code: "ACCOUNT_DEACTIVATED",
        message: "This account has been deactivated.",
      });
    }

    const newRaw = createOpaqueToken();
    const newHash = hashSha256(newRaw);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: newHash,
          expiresAt,
          ipAddress: input.ipAddress.slice(0, 64),
          userAgent: input.userAgent,
        },
      });
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: created.id,
        },
      });
    });

    const accessToken = await this.jwtAccess.signAccessToken({
      sub: existing.user.id,
      email: existing.user.email,
      globalRole: existing.user.globalRole,
    });
    await this.appendSessionAuditLog({
      actionKey: "auth.refresh",
      actorId: existing.user.id,
      actorEmail: existing.user.email,
      actorGlobalRole: existing.user.globalRole,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        rotatedFromTokenId: existing.id,
      },
    });

    return { accessToken, refreshToken: newRaw };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    const raw = refreshToken?.trim();
    if (!raw) {
      return;
    }
    const hash = hashSha256(raw);
    const existing = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hash,
      },
      include: {
        user: {
          select: { id: true, email: true, globalRole: true },
        },
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: hash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (existing?.user) {
      await this.appendSessionAuditLog({
        actionKey: "auth.logout",
        actorId: existing.user.id,
        actorEmail: existing.user.email,
        actorGlobalRole: existing.user.globalRole,
      });
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, globalRole: true },
    });
    await this.appendSessionAuditLog({
      actionKey: "auth.logout_all",
      actorId: userId,
      actorEmail: user?.email ?? null,
      actorGlobalRole: user?.globalRole ?? null,
    });
  }

  async resendVerification(input: {
    email: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    const generic = { message: "If an account exists for this email, a verification message was sent." };
    if (!user || user.isVerified) {
      return generic;
    }
    if (user.authProvider === "google") {
      return generic;
    }

    const now = new Date();
    const verificationToken = createOpaqueToken();
    const verificationTokenHash = hashSha256(verificationToken);
    const expiresAt = new Date(now.getTime() + verificationTokenTtlMs);

    const stored = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });
      return tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: verificationTokenHash,
          expiresAt,
        },
        select: { id: true },
      });
    });

    const encryptedVerificationToken = encryptVerificationToken({
      token: verificationToken,
      secret: apiRuntimeEnv.JWT_ACCESS_SECRET,
    });
    const verificationJob = createVerificationEmailJob({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      verificationTokenId: stored.id,
      encryptedVerificationToken,
      now,
    });
    await enqueueVerificationEmailJob({ job: verificationJob }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[api] failed to enqueue verification email job: ${message}`);
    });

    return generic;
  }

  async requestPasswordReset(input: { email: string }): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null, isActive: true },
    });
    const generic = {
      message: "If an account exists for this email, password reset instructions were sent.",
    };
    if (!user || user.authProvider === "google") {
      return generic;
    }
    const token = createOpaqueToken();
    const tokenHash = hashSha256(token);
    const expiresAt = new Date(Date.now() + passwordResetTtlMs);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
    const resetUrl = `${apiRuntimeEnv.BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
    console.info(`[api] password reset link for ${user.email}: ${resetUrl}`);
    return generic;
  }

  async resetPassword(input: { token: string; password: string }): Promise<{ message: string }> {
    const tokenHash = hashSha256(input.token);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });
    const now = new Date();
    if (!record || record.usedAt || record.expiresAt.getTime() <= now.getTime()) {
      throw new AppError({
        code: "TOKEN_INVALID",
        message: "Password reset token is invalid or expired",
        statusCode: 400,
      });
    }
    if (!record.user || record.user.deletedAt || !record.user.isActive) {
      throw new AppError({
        code: "ACCOUNT_DEACTIVATED",
        message: "This account cannot be updated.",
      });
    }
    const passwordHash = await bcrypt.hash(input.password, apiRuntimeEnv.BCRYPT_COST);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
        },
      });
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      });
      await tx.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
    await this.appendSessionAuditLog({
      actionKey: "auth.password_reset",
      actorId: record.userId,
      actorEmail: record.user.email,
      actorGlobalRole: record.user.globalRole,
    });
    return { message: "Password updated successfully." };
  }

  async completeGoogleOAuth(input: {
    googleSub: string;
    email: string;
    fullName: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: SessionUser }> {
    const email = input.email.trim().toLowerCase();
    let user = await this.prisma.user.findFirst({
      where: {
        authProvider: "google",
        authProviderId: input.googleSub,
        deletedAt: null,
      },
    });
    if (!user) {
      const byEmail = await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
      });
      if (byEmail) {
        if (byEmail.authProvider === "local") {
          throw new AppError({
            code: "ACCOUNT_EXISTS_LOCAL",
            message: "An account with this email already exists. Sign in with email and password.",
          });
        }
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            authProvider: "google",
            authProviderId: input.googleSub,
            isVerified: true,
            lastLoginAt: new Date(),
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            fullName: input.fullName.slice(0, 200),
            authProvider: "google",
            authProviderId: input.googleSub,
            isVerified: true,
            isActive: true,
            lastLoginAt: new Date(),
          },
        });
      }
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    if (!user.isActive) {
      throw new AppError({
        code: "ACCOUNT_DEACTIVATED",
        message: "This account has been deactivated.",
      });
    }

    const tokens = await this.issueTokensForUser({
      user: {
        id: user.id,
        email: user.email,
        globalRole: user.globalRole,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        globalRole: user.globalRole,
        isVerified: user.isVerified,
        authProvider: user.authProvider,
      },
    };
  }
}
