import { io, type Socket } from "socket.io-client";
import { resolveRealtimeSocketOrigin } from "@/api/client";
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
  | "comment:thread_created"
  | "comment:reply_created"
  | "comment:updated"
  | "comment:deleted"
  | "comment:resolved"
  | "comment:unresolved";

export type ActivityRealtimeEvent = "activity:new" | "activity:created";

export type NotificationRealtimeEvent = "notification:created";

export type WorkspaceRealtimeEvent = "workspace:role_changed";

let socket: Socket | null = null;
const reconnectListeners = new Set<() => void>();

function getRealtimeBaseUrl(): string {
  return resolveRealtimeSocketOrigin();
}

/** Nest RealtimeGateway uses namespace `/realtime` — client must match. */
function getRealtimeNamespaceUrl(): string {
  const base = getRealtimeBaseUrl().replace(/\/+$/, "");
  return `${base}/realtime`;
}

function attachLifecycleHandlers(instance: Socket): void {
  if ((instance as Socket & { __csLifecycle?: boolean }).__csLifecycle) return;
  (instance as Socket & { __csLifecycle?: boolean }).__csLifecycle = true;

  instance.on("connect", () => {
    for (const listener of reconnectListeners) {
      listener();
    }
  });
}

export function getRealtimeSocket(): Socket {
  if (socket) return socket;
  socket = io(getRealtimeNamespaceUrl(), {
    path: "/socket.io",
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket"],
    auth: () => {
      const token = authSession.getAccessToken();
      return token ? { token } : {};
    },
  });
  attachLifecycleHandlers(socket);
  return socket;
}

export function connectRealtime(): Socket {
  const instance = getRealtimeSocket();
  if (!instance.connected) {
    instance.connect();
  }
  return instance;
}

/** Resolves when the socket is connected (or immediately if already connected). */
export function ensureRealtimeConnected(): Promise<Socket> {
  const instance = getRealtimeSocket();
  if (instance.connected) {
    return Promise.resolve(instance);
  }
  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve(instance);
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
    connectRealtime();
  });
}

/** Called after connect/reconnect so workspace rooms can be re-joined. */
export function onRealtimeReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => reconnectListeners.delete(listener);
}

export async function joinWorkspaceRoom(workspaceId: string): Promise<void> {
  const instance = await ensureRealtimeConnected();
  await new Promise<void>((resolve, reject) => {
    instance.emit("room:join:workspace", { workspaceId }, (ack: { ok?: boolean; message?: string }) => {
      if (ack?.ok) {
        resolve();
        return;
      }
      reject(new Error(ack?.message ?? "Failed to join workspace realtime room."));
    });
  });
}

export function subscribeRealtimeStatus(
  onStatus: (status: RealtimeConnectionStatus) => void,
): () => void {
  const instance = connectRealtime();
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
  const instance = connectRealtime();
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
  "comment:thread_created",
  "comment:reply_created",
  "comment:updated",
  "comment:deleted",
  "comment:resolved",
  "comment:unresolved",
];

export function subscribeCommentEvents(
  onEvent: (event: CommentRealtimeEvent, payload: unknown) => void,
): () => void {
  const instance = connectRealtime();
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
  const instance = connectRealtime();
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
  const instance = connectRealtime();
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

const WORKSPACE_EVENTS: WorkspaceRealtimeEvent[] = ["workspace:role_changed"];

export function subscribeWorkspaceEvents(
  onEvent: (event: WorkspaceRealtimeEvent, payload: unknown) => void,
): () => void {
  const instance = connectRealtime();
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
  if (!socket) {
    return;
  }
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

/** Exposed for unit tests — verifies namespace URL includes /realtime. */
export function getRealtimeNamespaceUrlForTests(): string {
  return getRealtimeNamespaceUrl();
}
