import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ensureRealtimeConnected,
  subscribeNotificationEvents,
} from "@/api/realtime/socket-client";
import { useCurrentAccount } from "@/lib/auth-session";
import { queryKeys } from "@/lib/query-keys";

/** Invalidates notification queries when the API pushes notification:created to the user room. */
export function useNotificationRealtime() {
  const queryClient = useQueryClient();
  const account = useCurrentAccount();

  useEffect(() => {
    if (!account?.id) return;

    let cancelled = false;
    void ensureRealtimeConnected().then(() => {
      if (cancelled) return;
    });

    const unsubscribe = subscribeNotificationEvents((_event, payload) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      const data = payload as { title?: string } | null;
      if (data?.title) {
        toast.info(data.title);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [account?.id, queryClient]);
}
