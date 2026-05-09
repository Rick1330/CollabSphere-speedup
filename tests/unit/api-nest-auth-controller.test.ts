import test from "node:test";
import assert from "node:assert/strict";
import "../integration/nest-api-http-env.setup.ts";
import type { Response } from "express";
import { AuthNestController } from "../../apps/api/src/auth/auth.nest.controller.js";

const createController = () => {
  const authAppService = {
    register: async () => ({ message: "Registration successful. Please verify your email." }),
    verifyEmail: async () => ({ message: "Email verified successfully." }),
  } as const;

  const authSession = {
    login: async () => ({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      user: { id: "u1", email: "jane@example.com", fullName: "Jane", globalRole: "USER", isVerified: true, authProvider: "local" },
    }),
    refreshSession: async () => ({ accessToken: "access-2", refreshToken: "refresh-2" }),
    logout: async () => undefined,
    logoutAll: async () => undefined,
    resendVerification: async () => ({ message: "ok" }),
    requestPasswordReset: async () => ({ message: "ok" }),
    resetPassword: async () => ({ message: "ok" }),
    issueCollabToken: async () => ({ token: "collab-token-1", expiresInSeconds: 300 }),
    completeGoogleOAuth: async () => ({
      accessToken: "access-g",
      refreshToken: "refresh-g",
      user: { id: "u1", email: "jane@example.com", fullName: "Jane", globalRole: "USER", isVerified: true, authProvider: "google" },
    }),
  } as const;

  const googleOAuth = {
    isConfigured: () => false,
    buildAuthorizationUrl: () => "https://example.com",
    exchangeCodeForProfile: async () => ({ sub: "g1", email: "jane@example.com", fullName: "Jane" }),
  } as const;

  return new AuthNestController(authAppService as never, authSession as never, googleOAuth as never);
};

test("AuthNestController.register wraps success response", async () => {
  const controller = createController();
  const response = await controller.register(
    "req-1",
    {
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "Passw0rd!",
      confirmPassword: "Passw0rd!",
    },
    "127.0.0.1",
    "unit-test",
  );

  assert.equal(response.statusCode, 201);
  assert.equal(response.data.message, "Registration successful. Please verify your email.");
  assert.equal(response.meta.requestId, "req-1");
});

test("AuthNestController.verifyEmail wraps success response", async () => {
  const controller = createController();
  const response = await controller.verifyEmail(
    "req-2",
    {
      token: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
    "127.0.0.1",
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.data.message, "Email verified successfully.");
  assert.equal(response.meta.requestId, "req-2");
});

test("AuthNestController.login wraps success response", async () => {
  const controller = createController();
  const res = {
    cookie: () => undefined,
  } as unknown as Response;

  const response = await controller.login(
    "req-3",
    { email: "jane@example.com", password: "Passw0rd!" },
    "127.0.0.1",
    "unit-test",
    res,
  );

  assert.equal(response.data.message, "Signed in successfully.");
  assert.equal(response.meta.requestId, "req-3");
});

test("AuthNestController.issueCollabToken returns token payload", async () => {
  const controller = createController();
  const response = await controller.issueCollabToken("req-4", "user-1", {
    workspaceId: "ws-1",
    documentId: "doc-1",
  });
  assert.equal(response.data.message, "Collaboration token issued.");
  assert.equal((response.data as Record<string, unknown>).token, "collab-token-1");
  assert.equal((response.data as Record<string, unknown>).expiresInSeconds, 300);
});
