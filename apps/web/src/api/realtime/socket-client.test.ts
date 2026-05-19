import { beforeEach, describe, expect, it, vi } from "vitest";

const ioMock = vi.fn();
const connectMock = vi.fn();
const disconnectMock = vi.fn();
const onMock = vi.fn();
const emitMock = vi.fn();

let connectHandler: (() => void) | null = null;

function createMockSocket() {
  connectHandler = null;
  return {
    connected: false,
    auth: {},
    connect: connectMock.mockImplementation(function (this: { connected: boolean }) {
      this.connected = true;
      connectHandler?.();
    }),
    disconnect: disconnectMock,
    on: onMock.mockImplementation((event: string, handler: () => void) => {
      if (event === "connect") {
        connectHandler = handler;
      }
    }),
    once: vi.fn(),
    off: vi.fn(),
    emit: emitMock,
    io: { on: vi.fn(), off: vi.fn() },
    removeAllListeners: vi.fn(),
  };
}

vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

const getAccessTokenMock = vi.fn();
const subscribeMock = vi.fn(() => () => undefined);

vi.mock("@/lib/auth-session", () => ({
  authSession: {
    getAccessToken: getAccessTokenMock,
    subscribe: subscribeMock,
  },
}));

vi.mock("@/api/client", () => ({
  resolveRealtimeSocketOrigin: () => "http://127.0.0.1:3001",
  httpUrlOrigin: (url: string) => url,
  normalizeDevApiAbsoluteUrl: (url: string) => url,
}));

describe("socket-client", () => {
  beforeEach(async () => {
    vi.resetModules();
    ioMock.mockReset();
    connectMock.mockReset();
    disconnectMock.mockReset();
    onMock.mockReset();
    emitMock.mockReset();
    getAccessTokenMock.mockReset();
    subscribeMock.mockClear();
    connectHandler = null;

    const mod = await import("./socket-client");
    mod.disconnectRealtime();
  });

  it("resolves namespace URL ending with /realtime", async () => {
    const { resolveRealtimeNamespaceUrl } = await import("./socket-client");
    expect(resolveRealtimeNamespaceUrl()).toBe("http://127.0.0.1:3001/realtime");
  });

  it("creates socket with websocket-only transport and reconnection options", async () => {
    getAccessTokenMock.mockReturnValue("token-a");
    ioMock.mockReturnValue(createMockSocket());

    const { getRealtimeSocket } = await import("./socket-client");
    getRealtimeSocket();

    expect(ioMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/realtime",
      expect.objectContaining({
        path: "/socket.io",
        transports: ["websocket"],
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: 15,
      }),
    );
  });

  it("does not connect without an access token", async () => {
    getAccessTokenMock.mockReturnValue(null);
    ioMock.mockReturnValue(createMockSocket());

    const { initSocket } = await import("./socket-client");
    initSocket();

    expect(connectMock).not.toHaveBeenCalled();
  });

  it("connects when initSocket is called with a token", async () => {
    getAccessTokenMock.mockReturnValue("token-a");
    ioMock.mockReturnValue(createMockSocket());

    const { initSocket } = await import("./socket-client");
    initSocket();

    expect(connectMock).toHaveBeenCalled();
  });

  it("rejects ensureRealtimeConnected without a token", async () => {
    getAccessTokenMock.mockReturnValue(null);
    ioMock.mockReturnValue(createMockSocket());

    const { ensureRealtimeConnected } = await import("./socket-client");
    await expect(ensureRealtimeConnected()).rejects.toThrow(/access token/i);
  });

  it("tracks workspace rooms and replays join on connect", async () => {
    getAccessTokenMock.mockReturnValue("token-a");
    const mockSocket = createMockSocket();
    ioMock.mockReturnValue(mockSocket);

    emitMock.mockImplementation(
      (
        event: string,
        payload: { workspaceId?: string },
        ack?: (result: { ok: boolean }) => void,
      ) => {
        if (event === "room:join:workspace" && ack) {
          ack({ ok: true });
        }
      },
    );

    const { joinWorkspaceRoom, getJoinedRoomsForTests, replayJoinedRooms } = await import(
      "./socket-client"
    );

    mockSocket.connected = true;
    await joinWorkspaceRoom("ws-123");
    expect(getJoinedRoomsForTests().has("workspace:ws-123")).toBe(true);
    expect(emitMock).toHaveBeenCalledWith(
      "room:join:workspace",
      { workspaceId: "ws-123" },
      expect.any(Function),
    );

    emitMock.mockClear();
    await replayJoinedRooms();
    expect(emitMock).toHaveBeenCalledWith(
      "room:join:workspace",
      { workspaceId: "ws-123" },
      expect.any(Function),
    );
  });

  it("syncSocketAuthFromSession reconnects when the token changes", async () => {
    getAccessTokenMock.mockReturnValue("token-a");
    const mockSocket = createMockSocket();
    mockSocket.connected = true;
    ioMock.mockReturnValue(mockSocket);

    const { getRealtimeSocket, syncSocketAuthFromSession } = await import("./socket-client");
    getRealtimeSocket();

    getAccessTokenMock.mockReturnValue("token-b");
    syncSocketAuthFromSession();

    expect(disconnectMock).toHaveBeenCalled();
    expect(connectMock).toHaveBeenCalled();
    expect(mockSocket.auth).toEqual({ token: "token-b" });
  });
});
