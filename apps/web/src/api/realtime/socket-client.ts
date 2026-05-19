import { io, type Socket } from "socket.io-client";
import { httpUrlOrigin, normalizeDevApiAbsoluteUrl, resolveRealtimeSocketOrigin } from "@/api/client";
import { authSession } from "@/lib/auth-session";

export type RealtimeConnectionStatus = "connected" | "reconnecting" | "unavailable";
export type TaskRealtimeEvent =
  | "task:created"
  | "task:updated"
  | "task:assigned"
  | "task:moved"
  | "task:status_changed"
  | "task:deleted"
  | "task:completed";

export type CommentRealtimeEvent =
  | "comment:created"
  | "comment:updated"
  | "comment:deleted"
  | "comment:thread_resolved"
  | "comment:thread_created"
  | "comment:reply_created"
  | "comment:resolved"
  | "comment:unresolved";

export type ActivityRealtimeEvent = "activity:new" | "activity:created";

export type NotificationRealtimeEvent = "notification:created";

export type DocumentRealtimeEvent =
  | "document:created"
  | "document:status_changed"
  | "document:locked"
  | "document:unlocked"
  | "document:submitted"
  | "document:approved";

export type WorkspaceRealtimeEvent =
  | "workspace:role_changed"
  | "workspace:member_joined"
  | "workspace:member_removed"
  | "workspace:settings_updated"
  | "workspace:archived"
  | "workspace:updated";

/** All events delivered on the workspace Socket.IO room. */
export type WorkspaceRoomRealtimeEvent =
  | WorkspaceRealtimeEvent
  | DocumentRealtimeEvent
  | TaskRealtimeEvent
  | CommentRealtimeEvent
  | ActivityRealtimeEvent;

type RoomAck = { ok?: boolean; message?: string };

let socket: Socket | null = null;
let lastSyncedToken: string | null = null;
let authSyncUnsubscribe: (() => void) | null = null;
let replayInFlight: Promise<void> | null = null;

const reconnectListeners = new Set<() => void>();
/** Rooms to re-join after every connect/reconnect (e.g. `workspace:{uuid}`). */
const joinedRooms = new Set<string>();

function trimEnvString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

/** Prefers `VITE_SOCKET_URL`, then existing realtime origin resolver. */
export function resolveSocketOrigin(): string {
  const fromSocketUrl = trimEnvString(import.meta.env.VITE_SOCKET_URL);
  if (fromSocketUrl) {
    if (/^https?:\/\//i.test(fromSocketUrl)) {
      return httpUrlOrigin(normalizeDevApiAbsoluteUrl(fromSocketUrl));
    }
    return fromSocketUrl.replace(/\/+$/, "") || "/";
  }
  return resolveRealtimeSocketOrigin();
}

/** Nest RealtimeGateway uses namespace `/realtime` — client must match. */
export function resolveRealtimeNamespaceUrl(): string {
  const base = resolveSocketOrigin().replace(/\/+$/, "");
  return `${base}/realtime`;
}

function workspaceRoomKey(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}

function readAuthPayload(): { token: string | undefined } {
  const token = authSession.getAccessToken() ?? undefined;
  return { token };
}

function applyAuthToSocket(instance: Socket, token: string | null): void {
  instance.auth = token ? { token } : {};
}

async function emitJoinRoom(instance: Socket, roomKey: string): Promise<void> {
  if (roomKey.startsWith("workspace:")) {
    const workspaceId = roomKey.slice("workspace:".length);
    await new Promise<void>((resolve, reject) => {
      instance.emit("room:join:workspace", { workspaceId }, (ack: RoomAck) => {
        if (ack?.ok) {
          resolve();
          return;
        }
        reject(new Error(ack?.message ?? "Failed to join workspace realtime room."));
      });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    instance.emit("room:join", { room: roomKey }, (ack: RoomAck) => {
      if (ack?.ok) {
        resolve();
        return;
      }
      reject(new Error(ack?.message ?? "Failed to join realtime room."));
    });
  });
}

async function emitLeaveRoom(instance: Socket, roomKey: string): Promise<void> {
  if (roomKey.startsWith("workspace:")) {
    const workspaceId = roomKey.slice("workspace:".length);
    await new Promise<void>((resolve, reject) => {
      instance.emit("room:leave:workspace", { workspaceId }, (ack: RoomAck) => {
        if (ack?.ok) {
          resolve();
          return;
        }
        reject(new Error(ack?.message ?? "Failed to leave workspace realtime room."));
      });
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    instance.emit("room:leave", { room: roomKey }, (ack: RoomAck) => {
      if (ack?.ok) {
        resolve();
        return;
      }
      reject(new Error(ack?.message ?? "Failed to leave realtime room."));
    });
  });
}

/** Re-join all tracked rooms after connect/reconnect. */
export async function replayJoinedRooms(): Promise<void> {
  if (!socket?.connected || joinedRooms.size === 0) {
    return;
  }
  if (replayInFlight) {
    return replayInFlight;
  }

  const instance = socket;
  replayInFlight = (async () => {
    for (const roomKey of joinedRooms) {
      try {
        await emitJoinRoom(instance, roomKey);
      } catch {
        /* membership or transient errors — hook-level listeners may retry */
      }
    }
  })().finally(() => {
    replayInFlight = null;
  });

  return replayInFlight;
}

function attachLifecycleHandlers(instance: Socket): void {
  if ((instance as Socket & { __csLifecycle?: boolean }).__csLifecycle) return;
  (instance as Socket & { __csLifecycle?: boolean }).__csLifecycle = true;

  instance.on("connect", () => {
    void replayJoinedRooms();
    for (const listener of reconnectListeners) {
      listener();
    }
  });
}

export function getRealtimeSocket(): Socket {
  if (socket) return socket;

  socket = io(resolveRealtimeNamespaceUrl(), {
    path: "/socket.io",
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 15,
    auth: (cb) => {
      cb(readAuthPayload());
    },
  });
  attachLifecycleHandlers(socket);
  lastSyncedToken = authSession.getAccessToken();
  applyAuthToSocket(socket, lastSyncedToken);
  return socket;
}

/** Spec alias — same singleton instance. */
export const getSocket = getRealtimeSocket;

/**
 * Update handshake auth from the current session and reconnect when the token rotates.
 * Call after silent `/auth/refresh` or when `authSession` changes.
 */
export function syncSocketAuthFromSession(): void {
  const instance = socket;
  const token = authSession.getAccessToken();
  if (!instance) {
    lastSyncedToken = token;
    return;
  }

  const tokenChanged = token !== lastSyncedToken;
  lastSyncedToken = token;
  applyAuthToSocket(instance, token);

  if (!token) {
    if (instance.connected) {
      instance.disconnect();
    }
    return;
  }

  if (tokenChanged && instance.connected) {
    instance.disconnect();
    instance.connect();
  }
}

/** Subscribe once to session token changes (idempotent). */
export function bindAuthTokenSync(): () => void {
  if (authSyncUnsubscribe) {
    return authSyncUnsubscribe;
  }

  authSyncUnsubscribe = authSession.subscribe(() => {
    syncSocketAuthFromSession();
  });

  return authSyncUnsubscribe;
}

/** Connect when authenticated; no-op without access token. */
export function initSocket(): Socket {
  const instance = getRealtimeSocket();
  if (!authSession.getAccessToken()) {
    return instance;
  }
  if (!instance.connected) {
    instance.connect();
  }
  return instance;
}

export function connectRealtime(): Socket {
  return initSocket();
}

/** Resolves when the socket is connected (or immediately if already connected). */
export function ensureRealtimeConnected(): Promise<Socket> {
  if (!authSession.getAccessToken()) {
    return Promise.reject(new Error("Cannot connect to realtime without an access token."));
  }

  const instance = getRealtimeSocket();
  if (instance.connected) {
    return replayJoinedRooms().then(() => instance);
  }

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      void replayJoinedRooms().then(
        () => resolve(instance),
        () => resolve(instance),
      );
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to connect to realtime server."));
    };
    const cleanup = () => {
      instance.off("connect", onConnect);
      instance.off("connect_error", onError);
    };
    instance.once("connect", onConnect);
    instance.once("connect_error", onError);
    initSocket();
  });
}

/** Called after connect/reconnect for hook-level side effects (room replay is automatic). */
export function onRealtimeReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => reconnectListeners.delete(listener);
}

export async function joinWorkspaceRoom(workspaceId: string): Promise<void> {
  joinedRooms.add(workspaceRoomKey(workspaceId));
  const instance = await ensureRealtimeConnected();
  await emitJoinRoom(instance, workspaceRoomKey(workspaceId));
}

export async function leaveWorkspaceRoom(workspaceId: string): Promise<void> {
  const roomKey = workspaceRoomKey(workspaceId);
  joinedRooms.delete(roomKey);
  if (!socket?.connected) {
    return;
  }
  try {
    await emitLeaveRoom(socket, roomKey);
  } catch {
    /* best-effort on navigation away */
  }
}

/** For tests — inspect tracked workspace rooms. */
export function getJoinedRoomsForTests(): ReadonlySet<string> {
  return joinedRooms;
}

export function subscribeRealtimeStatus(
  onStatus: (status: RealtimeConnectionStatus) => void,
): () => void {
  const instance = getRealtimeSocket();
  if (authSession.getAccessToken()) {
    initSocket();
  }

  const onConnect = () => onStatus("connected");
  const onReconnectAttempt = () => onStatus("reconnecting");
  const onDisconnect = () => onStatus("unavailable");
  const onConnectError = () => onStatus("unavailable");

  onStatus(instance.connected ? "connected" : "reconnecting");
  instance.on("connect", onConnect);
  instance.io.on("reconnect_attempt", onReconnectAttempt);
  instance.on("disconnect", onDisconnect);
  instance.on("connect_error", onConnectError);

  return () => {
    instance.off("connect", onConnect);
    instance.io.off("reconnect_attempt", onReconnectAttempt);
    instance.off("disconnect", onDisconnect);
    instance.off("connect_error", onConnectError);
  };
}

const TASK_EVENTS: TaskRealtimeEvent[] = [
  "task:created",
  "task:updated",
  "task:assigned",
  "task:moved",
  "task:status_changed",
  "task:deleted",
  "task:completed",
];

export function subscribeTaskEvents(
  onEvent: (event: TaskRealtimeEvent, payload: unknown) => void,
): () => void {
  const instance = getRealtimeSocket();
  if (authSession.getAccessToken()) {
    initSocket();
  }
  const listeners = TASK_EVENTS.map((event) => {
    const handler = (payload: unknown) => onEvent(event, payload);
    instance.on(event, handler);
    return { event, handler };
  });

  return () => {
    for (const listener of listeners) {
      instance.off(listener.event, listener.handler);
    }
  };
}

const COMMENT_EVENTS: CommentRealtimeEvent[] = [
  "comment:created",
  "comment:updated",
  "comment:deleted",
  "comment:thread_resolved",
  "comment:thread_created",
  "comment:reply_created",
  "comment:resolved",
  "comment:unresolved",
];

export function subscribeCommentEvents(
  onEvent: (event: CommentRealtimeEvent, payload: unknown) => void,
): () => void {
  const instance = getRealtimeSocket();
  if (authSession.getAccessToken()) {
    initSocket();
  }
  const listeners = COMMENT_EVENTS.map((event) => {
    const handler = (payload: unknown) => onEvent(event, payload);
    instance.on(event, handler);
    return { event, handler };
  });

  return () => {
    for (const listener of listeners) {
      instance.off(listener.event, listener.handler);
    }
  };
}

const ACTIVITY_EVENTS: ActivityRealtimeEvent[] = ["activity:new", "activity:created"];

export function subscribeActivityEvents(
  onEvent: (event: ActivityRealtimeEvent, payload: unknown) => void,
): () => void {
  const instance = getRealtimeSocket();
  if (authSession.getAccessToken()) {
    initSocket();
  }
  const listeners = ACTIVITY_EVENTS.map((event) => {
    const handler = (payload: unknown) => onEvent(event, payload);
    instance.on(event, handler);
    return { event, handler };
  });

  return () => {
    for (const listener of listeners) {
      instance.off(listener.event, listener.handler);
    }
  };
}

const NOTIFICATION_EVENTS: NotificationRealtimeEvent[] = ["notification:created"];

export function subscribeNotificationEvents(
  onEvent: (event: NotificationRealtimeEvent, payload: unknown) => void,
): () => void {
  const instance = getRealtimeSocket();
  if (authSession.getAccessToken()) {
    initSocket();
  }
  const listeners = NOTIFICATION_EVENTS.map((event) => {
    const handler = (payload: unknown) => onEvent(event, payload);
    instance.on(event, handler);
    return { event, handler };
  });

  return () => {
    for (const listener of listeners) {
      instance.off(listener.event, listener.handler);
    }
  };
}

const WORKSPACE_EVENTS: WorkspaceRealtimeEvent[] = [
  "workspace:role_changed",
  "workspace:member_joined",
  "workspace:member_removed",
  "workspace:settings_updated",
  "workspace:archived",
  "workspace:updated",
];

export function subscribeWorkspaceEvents(
  onEvent: (event: WorkspaceRealtimeEvent, payload: unknown) => void,
): () => void {
  const instance = getRealtimeSocket();
  if (authSession.getAccessToken()) {
    initSocket();
  }
  const listeners = WORKSPACE_EVENTS.map((event) => {
    const handler = (payload: unknown) => onEvent(event, payload);
    instance.on(event, handler);
    return { event, handler };
  });

  return () => {
    for (const listener of listeners) {
      instance.off(listener.event, listener.handler);
    }
  };
}

/** Tear down the singleton socket (call on sign-out / account switch). */
export function disconnectRealtime(): void {
  joinedRooms.clear();
  lastSyncedToken = null;
  if (!socket) {
    return;
  }
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

/** Spec alias. */
export const disconnectSocket = disconnectRealtime;

/** @deprecated Use {@link resolveRealtimeNamespaceUrl}. */
export function getRealtimeNamespaceUrlForTests(): string {
  return resolveRealtimeNamespaceUrl();
}
