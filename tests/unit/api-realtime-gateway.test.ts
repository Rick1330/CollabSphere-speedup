import assert from "node:assert/strict";
import test from "node:test";
import type { Socket } from "socket.io";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import { RealtimeSessionService } from "../../apps/api/src/realtime/realtime-session.service.js";

const createSocket = () => {
  const joinedRooms: string[] = [];
  const leftRooms: string[] = [];
  let disconnected = false;

  const socket = {
    handshake: {
      auth: {},
      headers: {},
    },
    data: {},
    join: async (room: string) => {
      joinedRooms.push(room);
    },
    leave: async (room: string) => {
      leftRooms.push(room);
    },
    disconnect: () => {
      disconnected = true;
    },
  } as unknown as Socket;

  return {
    socket,
    joinedRooms,
    leftRooms,
    isDisconnected: () => disconnected,
  };
};

test("realtime session authenticates socket token", async () => {
  const service = new RealtimeSessionService(
    {
      verifyAccessToken: async () => ({
        sub: "user-1",
        email: "user@example.com",
        globalRole: "USER",
      }),
    } as never,
    {
      workspaceMember: {
        findFirst: async () => ({ id: "membership-1" }),
      },
    } as never,
  );

  const socketRef = createSocket();
  socketRef.socket.handshake.auth = { token: "token-value" };
  const user = await service.authenticateSocket(socketRef.socket);

  assert.equal(user.userId, "user-1");
  assert.equal(service.toUserRoom(user.userId), "user:user-1");
});

test("realtime session rejects invalid token handshake", async () => {
  const service = new RealtimeSessionService(
    {
      verifyAccessToken: async () => {
        throw new Error("bad token");
      },
    } as never,
    {
      workspaceMember: {
        findFirst: async () => ({ id: "membership-1" }),
      },
    } as never,
  );

  const socketRef = createSocket();
  socketRef.socket.handshake.auth = { token: "bad-token" };
  await assert.rejects(() => service.authenticateSocket(socketRef.socket));
});

test("realtime session enforces workspace membership", async () => {
  const service = new RealtimeSessionService(
    {
      verifyAccessToken: async () => ({
        sub: "user-1",
        email: "user@example.com",
        globalRole: "USER",
      }),
    } as never,
    {
      workspaceMember: {
        findFirst: async () => null,
      },
    } as never,
  );

  const socketRef = createSocket();
  socketRef.socket.data = {
    user: {
      userId: "user-1",
      email: "user@example.com",
      globalRole: "USER",
    },
  };

  await assert.rejects(
    () => service.assertWorkspaceMembership("user-1", "ws-1"),
    (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "NOT_WORKSPACE_MEMBER");
      return true;
    },
  );
});

test("realtime session resolves room names", () => {
  const service = new RealtimeSessionService(
    {
      verifyAccessToken: async () => ({
        sub: "user-1",
        email: "user@example.com",
        globalRole: "USER",
      }),
    } as never,
    {
      workspaceMember: {
        findFirst: async () => ({ id: "membership-1" }),
      },
    } as never,
  );
  assert.equal(service.toWorkspaceRoom("ws-1"), "workspace:ws-1");
  assert.equal(service.toTaskRoom("task-7"), "task:task-7");
});
