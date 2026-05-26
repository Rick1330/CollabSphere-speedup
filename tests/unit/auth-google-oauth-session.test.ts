import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import { AuthSessionService } from "../../apps/api/src/auth/auth-session.service.js";

const createSessionService = (prisma: Record<string, unknown>) => {
  const jwtAccess = {
    signAccessToken: async () => "access-token",
  };
  return new AuthSessionService(prisma as never, jwtAccess as never);
};

test("completeGoogleOAuth rejects local account with same email", async () => {
  const prisma = {
    user: {
      findFirst: async (args: { where: Record<string, unknown> }) => {
        if (args.where.authProvider === "google") {
          return null;
        }
        return {
          id: "u-local",
          email: "demo@example.com",
          authProvider: "local",
          deletedAt: null,
        };
      },
    },
  };

  const service = createSessionService(prisma);
  await assert.rejects(
    () =>
      service.completeGoogleOAuth({
        googleSub: "google-sub-1",
        email: "demo@example.com",
        fullName: "Demo",
        ipAddress: "127.0.0.1",
        userAgent: "test",
      }),
    (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "ACCOUNT_EXISTS_LOCAL");
      return true;
    },
  );
});

test("completeGoogleOAuth creates google user and issues tokens", async () => {
  const prisma = {
    user: {
      findFirst: async () => null,
      create: async () => ({
        id: "u-google",
        email: "new@example.com",
        fullName: "New User",
        globalRole: "USER",
        isVerified: true,
        isActive: true,
        authProvider: "google",
      }),
      update: async () => {
        throw new Error("unexpected update");
      },
    },
    refreshToken: {
      create: async () => ({ id: "rt-1" }),
    },
  };

  const service = createSessionService(prisma);
  const session = await service.completeGoogleOAuth({
    googleSub: "google-sub-2",
    email: "new@example.com",
    fullName: "New User",
    ipAddress: "127.0.0.1",
    userAgent: "test",
  });

  assert.equal(session.accessToken, "access-token");
  assert.equal(session.user.authProvider, "google");
});
