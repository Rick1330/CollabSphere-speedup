import assert from "node:assert/strict";
import test from "node:test";
import type { Server, Socket } from "socket.io";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import {
  RealtimeGateway,
  resolveGatewayRedisUrl,
} from "../../apps/api/src/realtime/realtime.gateway.js";
import { RealtimeSessionService } from "../../apps/api/src/realtime/realtime-session.service.js";

function createSessionMock(overrides?: Partial<RealtimeSessionService>): RealtimeSessionService {
  return {
    getAuthenticatedUser: () => {
      throw new AppError({ code: "UNAUTHORIZED", message: "Socket user is not authenticated" });
    },
    assertWorkspaceMembership: async () => undefined,
    assertTaskInWorkspace: async () => undefined,
    assertDocumentInWorkspace: async () => undefined,
    resolveTaskWorkspaceId: async () => null,
    toWorkspaceRoom: (id: string) => `workspace:${id}`,
    toUserRoom: (id: string) => `user:${id}`,
    toTaskRoom: (id: string) => `task:${id}`,
    toDocumentRoom: (id: string) => `document:${id}`,
    ...overrides,
  } as RealtimeSessionService;
}

function mockServer(adapterName?: string): Server {
  return {
    adapter: () => (adapterName ? { constructor: { name: adapterName } } : undefined),
    to: () => ({ emit: () => undefined }),
  } as Server;
}

function mockClient(): Socket {
  return {
    join: async () => undefined,
    leave: async () => undefined,
    data: {},
  } as Socket;
}

test("resolveGatewayRedisUrl returns a string without throwing", () => {
  assert.equal(typeof resolveGatewayRedisUrl(), "string");
});

test("afterInit does not throw without ConfigService (uses apiRuntimeEnv)", () => {
  const prevSkip = process.env.SKIP_REDIS_IO_ADAPTER;
  process.env.SKIP_REDIS_IO_ADAPTER = "1";
  try {
    const gateway = new RealtimeGateway(createSessionMock());
    const server = mockServer("RedisAdapter");
    assert.doesNotThrow(() => gateway.afterInit(server));
  } finally {
    if (prevSkip === undefined) {
      delete process.env.SKIP_REDIS_IO_ADAPTER;
    } else {
      process.env.SKIP_REDIS_IO_ADAPTER = prevSkip;
    }
  }
});

test("handleJoin rejects unsupported room names", async () => {
  const gateway = new RealtimeGateway(
    createSessionMock({
      getAuthenticatedUser: () => ({
        userId: "u1",
        email: "u@example.com",
        globalRole: "USER",
      }),
    } as never),
  );

  const result = await gateway.handleJoin(mockClient(), { room: "custom:evil-room" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /unsupported room/i);
  }
});

test("handleJoin requires workspaceId for task rooms", async () => {
  const gateway = new RealtimeGateway(
    createSessionMock({
      getAuthenticatedUser: () => ({
        userId: "u1",
        email: "u@example.com",
        globalRole: "USER",
      }),
    } as never),
  );

  const result = await gateway.handleJoin(mockClient(), { room: "task:task-1" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /workspaceId/i);
  }
});

test("leaveTaskRoom rejects unauthenticated socket", async () => {
  const gateway = new RealtimeGateway(createSessionMock());
  const result = await gateway.leaveTaskRoom(mockClient(), { taskId: "task-1" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /not authenticated/i);
  }
});

test("leaveTaskRoom succeeds when user and task are valid", async () => {
  const gateway = new RealtimeGateway(
    createSessionMock({
      getAuthenticatedUser: () => ({
        userId: "u1",
        email: "u@example.com",
        globalRole: "USER",
      }),
      resolveTaskWorkspaceId: async () => "ws-1",
      assertTaskInWorkspace: async () => undefined,
    } as never),
  );

  const result = await gateway.leaveTaskRoom(mockClient(), { taskId: "task-1" });
  assert.equal(result.ok, true);
});
