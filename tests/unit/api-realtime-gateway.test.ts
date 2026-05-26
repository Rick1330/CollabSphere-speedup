import assert from "node:assert/strict";
import test from "node:test";
import type { Server, Socket } from "socket.io";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import {
  RealtimeGateway,
  resolveGatewayRedisUrl,
} from "../../apps/api/src/realtime/realtime.gateway.js";
import {
  registerNestApplication,
  registerRealtimeSessionService,
} from "../../apps/api/src/realtime/realtime-session.registry.js";
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

const createModuleRefMock = (session: RealtimeSessionService) =>
  ({
    get: (token: unknown) => (token === RealtimeSessionService ? session : undefined),
  }) as import("@nestjs/core").ModuleRef;

test("afterInit does not throw without ConfigService (uses apiRuntimeEnv)", () => {
  const prevSkip = process.env.SKIP_REDIS_IO_ADAPTER;
  process.env.SKIP_REDIS_IO_ADAPTER = "1";
  try {
    const session = createSessionMock();
    const gateway = new RealtimeGateway(session, createModuleRefMock(session));
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
  const session = createSessionMock({
    getAuthenticatedUser: () => ({
      userId: "u1",
      email: "u@example.com",
      globalRole: "USER",
    }),
  } as never);
  const gateway = new RealtimeGateway(session, createModuleRefMock(session));

  const result = await gateway.handleJoin(mockClient(), { room: "custom:evil-room" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /unsupported room/i);
  }
});

test("handleJoin requires workspaceId for task rooms", async () => {
  const session = createSessionMock({
    getAuthenticatedUser: () => ({
      userId: "u1",
      email: "u@example.com",
      globalRole: "USER",
    }),
  } as never);
  const gateway = new RealtimeGateway(session, createModuleRefMock(session));

  const result = await gateway.handleJoin(mockClient(), { room: "task:task-1" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /workspaceId/i);
  }
});

test("leaveTaskRoom rejects unauthenticated socket", async () => {
  const session = createSessionMock();
  const gateway = new RealtimeGateway(session, createModuleRefMock(session));
  const result = await gateway.leaveTaskRoom(mockClient(), { taskId: "task-1" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /not authenticated/i);
  }
});

test("afterInit registers static session service from injected gateway instance", async () => {
  const authenticateSocket = async () => ({
    userId: "u3",
    email: "u3@example.com",
    globalRole: "USER" as const,
  });
  const session = createSessionMock({
    authenticateSocket,
    toUserRoom: (id: string) => `user:${id}`,
  } as never);
  const injected = new RealtimeGateway(session, createModuleRefMock(session));
  const prevSkip = process.env.SKIP_REDIS_IO_ADAPTER;
  process.env.SKIP_REDIS_IO_ADAPTER = "1";
  try {
    injected.afterInit(mockServer());

    const bare = new RealtimeGateway(
      undefined as unknown as RealtimeSessionService,
      undefined as unknown as import("@nestjs/core").ModuleRef,
    );
    const client = {
      join: async () => undefined,
      disconnect: () => undefined,
      data: {},
    } as unknown as import("socket.io").Socket;

    await bare.handleConnection(client);
    assert.equal((client.data as { user?: { userId: string } }).user?.userId, "u3");
  } finally {
    if (prevSkip === undefined) {
      delete process.env.SKIP_REDIS_IO_ADAPTER;
    } else {
      process.env.SKIP_REDIS_IO_ADAPTER = prevSkip;
    }
  }
});

test("handleConnection resolves session service via static registration when DI is missing", async () => {
  const authenticateSocket = async () => ({
    userId: "u2",
    email: "u2@example.com",
    globalRole: "USER" as const,
  });
  const session = createSessionMock({
    authenticateSocket,
    toUserRoom: (id: string) => `user:${id}`,
  } as never);

  RealtimeGateway.registerModuleRef(createModuleRefMock(session));
  RealtimeGateway.registerSessionService(session);

  const gateway = new RealtimeGateway(
    undefined as unknown as RealtimeSessionService,
    undefined as unknown as import("@nestjs/core").ModuleRef,
  );
  process.env.SKIP_REDIS_IO_ADAPTER = "1";
  gateway.afterInit(mockServer());

  const client = {
    join: async () => undefined,
    disconnect: () => undefined,
    data: {},
  } as unknown as import("socket.io").Socket;

  await gateway.handleConnection(client);
  assert.equal((client.data as { user?: { userId: string } }).user?.userId, "u2");
});

test("handleConnection authenticates via injected session service", async () => {
  const authenticateSocket = async () => ({
    userId: "u1",
    email: "u@example.com",
    globalRole: "USER" as const,
  });
  const session = createSessionMock({
    authenticateSocket,
    toUserRoom: (id: string) => `user:${id}`,
  } as never);
  const gateway = new RealtimeGateway(session, createModuleRefMock(session));
  process.env.SKIP_REDIS_IO_ADAPTER = "1";
  gateway.afterInit(mockServer());

  const client = {
    join: async () => undefined,
    disconnect: () => undefined,
    data: {},
  } as unknown as import("socket.io").Socket;

  await gateway.handleConnection(client);
  assert.equal((client.data as { user?: { userId: string } }).user?.userId, "u1");
});

test("joinDocumentRoom resolves session service via global registry when DI is missing", async () => {
  const session = createSessionMock({
    getAuthenticatedUser: () => ({
      userId: "u5",
      email: "u5@example.com",
      globalRole: "USER",
    }),
    assertDocumentInWorkspace: async () => undefined,
    toDocumentRoom: (id: string) => `document:${id}`,
  } as never);

  registerRealtimeSessionService(session);

  const gateway = new RealtimeGateway(
    undefined as unknown as RealtimeSessionService,
    undefined as unknown as import("@nestjs/core").ModuleRef,
  );

  const client = {
    join: async () => undefined,
    to: () => ({ emit: () => undefined }),
    data: { user: { userId: "u5", email: "u5@example.com", globalRole: "USER" } },
  } as unknown as import("socket.io").Socket;

  const result = await gateway.joinDocumentRoom(client, {
    workspaceId: "ws-1",
    documentId: "doc-1",
    fullName: "User Five",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.room, "document:doc-1");
  }
});

test("joinDocumentRoom resolves session service via Nest application global when DI is missing", async () => {
  const session = createSessionMock({
    getAuthenticatedUser: () => ({
      userId: "u6",
      email: "u6@example.com",
      globalRole: "USER",
    }),
    assertDocumentInWorkspace: async () => undefined,
    toDocumentRoom: (id: string) => `document:${id}`,
  } as never);

  registerNestApplication({
    get: (token: unknown) => (token === RealtimeSessionService ? session : undefined),
  } as import("@nestjs/common").INestApplication);

  const gateway = new RealtimeGateway(
    undefined as unknown as RealtimeSessionService,
    undefined as unknown as import("@nestjs/core").ModuleRef,
  );

  const client = {
    join: async () => undefined,
    to: () => ({ emit: () => undefined }),
    data: { user: { userId: "u6", email: "u6@example.com", globalRole: "USER" } },
  } as unknown as import("socket.io").Socket;

  const result = await gateway.joinDocumentRoom(client, {
    workspaceId: "ws-1",
    documentId: "doc-1",
    fullName: "User Six",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.room, "document:doc-1");
  }
});

test("joinDocumentRoom resolves session service via static registration when DI is missing", async () => {
  const session = createSessionMock({
    getAuthenticatedUser: () => ({
      userId: "u4",
      email: "u4@example.com",
      globalRole: "USER",
    }),
    assertDocumentInWorkspace: async () => undefined,
    toDocumentRoom: (id: string) => `document:${id}`,
  } as never);

  RealtimeGateway.registerModuleRef(createModuleRefMock(session));
  RealtimeGateway.registerSessionService(session);

  const gateway = new RealtimeGateway(
    undefined as unknown as RealtimeSessionService,
    undefined as unknown as import("@nestjs/core").ModuleRef,
  );

  const client = {
    join: async () => undefined,
    to: () => ({ emit: () => undefined }),
    data: { user: { userId: "u4", email: "u4@example.com", globalRole: "USER" } },
  } as unknown as import("socket.io").Socket;

  const result = await gateway.joinDocumentRoom(client, {
    workspaceId: "ws-1",
    documentId: "doc-1",
    fullName: "User Four",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.room, "document:doc-1");
  }
});

test("RealtimeSessionService.authenticateSocket fails clearly when JwtAccessService is missing", async () => {
  const service = new RealtimeSessionService(
    undefined as unknown as import("../../apps/api/src/auth/jwt-access.service.js").JwtAccessService,
    {
      user: { findFirst: async () => null },
    } as never,
  );

  const client = {
    handshake: {
      auth: { token: "test-token" },
      headers: {},
    },
  } as import("socket.io").Socket;

  await assert.rejects(
    () => service.authenticateSocket(client),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "UNAUTHORIZED");
      assert.match(error.message, /Realtime auth is not configured/);
      return true;
    },
  );
});

test("leaveTaskRoom succeeds when user and task are valid", async () => {
  const session = createSessionMock({
    getAuthenticatedUser: () => ({
      userId: "u1",
      email: "u@example.com",
      globalRole: "USER",
    }),
    resolveTaskWorkspaceId: async () => "ws-1",
    assertTaskInWorkspace: async () => undefined,
  } as never);
  const gateway = new RealtimeGateway(session, createModuleRefMock(session));

  const result = await gateway.leaveTaskRoom(mockClient(), { taskId: "task-1" });
  assert.equal(result.ok, true);
});
