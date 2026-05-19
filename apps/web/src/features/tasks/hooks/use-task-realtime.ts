import { useEffect, useState } from "react";
import {
  subscribeRealtimeStatus,
  subscribeTaskEvents,
  type TaskRealtimeEvent,
} from "@/api/realtime/socket-client";

export type RealtimeStatus = "connected" | "reconnecting" | "unavailable";

export function useTaskRealtime(
  workspaceId: string,
  onTaskEvent?: (event: TaskRealtimeEvent, payload: unknown) => void,
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("reconnecting");

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeRealtimeStatus((next) => {
      if (!cancelled) {
        setStatus(next);
      }
    });
    const unsubscribeTaskEvents = subscribeTaskEvents((event, payload) => {
      if (!cancelled && onTaskEvent) {
        onTaskEvent(event, payload);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeTaskEvents();
    };
  }, [workspaceId, onTaskEvent]);

  return status;
}
