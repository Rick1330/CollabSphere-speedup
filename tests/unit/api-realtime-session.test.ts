import assert from "node:assert/strict";
import test from "node:test";
import type { Socket } from "socket.io";
import { RealtimeSessionService } from "../../apps/api/src/realtime/realtime-session.service.js";

function mockSocket(token: string | null): Socket {
  return {
    handshake: {
      auth: token ? { token } : {},
      headers: {},
    },
  } as Socket;
}

test("authenticateSocket rejects when user is inactive or missing in DB", async () => {
  const jwtAccessService = {
    verifyAccessToken: async () => ({
      sub: "user-inactive",
      email: "inactive@example.com",
      globalRole: "USER",
    }),
  };
  const prisma = {
    user: {
      findFirst: async () => null,
    },
  };
  const svc = new RealtimeSessionService(jwtAccessService as never, prisma as never);

  await assert.rejects(
    () => svc.authenticateSocket(mockSocket("valid.jwt.token")),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /inactive|not found/i);
      return true;
    },
  );
});

test("authenticateSocket returns DB-backed profile for active user", async () => {
  const jwtAccessService = {
    verifyAccessToken: async () => ({
      sub: "user-active",
      email: "stale@example.com",
      globalRole: "USER",
    }),
  };
  const prisma = {
    user: {
      findFirst: async () => ({
        id: "user-active",
        email: "active@example.com",
        globalRole: "ADMIN",
      }),
    },
  };
  const svc = new RealtimeSessionService(jwtAccessService as never, prisma as never);

  const user = await svc.authenticateSocket(mockSocket("valid.jwt.token"));

  assert.equal(user.userId, "user-active");
  assert.equal(user.email, "active@example.com");
  assert.equal(user.globalRole, "ADMIN");
});

test("authenticateSocket rejects missing token", async () => {
  const svc = new RealtimeSessionService(
    { verifyAccessToken: async () => ({ sub: "x", email: "", globalRole: "USER" }) } as never,
    { user: { findFirst: async () => null } } as never,
  );

  await assert.rejects(() => svc.authenticateSocket(mockSocket(null)));
});
