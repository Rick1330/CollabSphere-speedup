import { io, type Socket } from "socket.io-client";
import { authSession } from "@/lib/auth-session";

export type RealtimeConnectionStatus = "connected" | "reconnecting" | "unavailable";
export type TaskRealtimeEvent =
  | "task:created"
  | "task:updated"
  | "task:assigned"
  | "task:status_changed"
  | "task:deleted";

let socket: Socket | null = null;

function getRealtimeBaseUrl(): string {
  return import.meta.env.VITE_REALTIME_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? "/";
}

export function getRealtimeSocket(): Socket {
  if (socket) return socket;
  socket = io(getRealtimeBaseUrl(), {
    path: "/socket.io",
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket"],
    auth: () => {
      const token = authSession.getAccessToken();
      return token ? { token } : {};
    },
  });
  return socket;
}

export function connectRealtime(): Socket {
  const instance = getRealtimeSocket();
  if (!instance.connected) {
    instance.connect();
  }
  return instance;
}

export async function joinWorkspaceRoom(workspaceId: string): Promise<void> {
  const instance = connectRealtime();
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
  "task:status_changed",
  "task:deleted",
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
