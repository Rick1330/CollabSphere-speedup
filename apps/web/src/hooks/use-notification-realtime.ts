import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ensureRealtimeConnected,
  subscribeNotificationEvents,
} from "@/api/realtime/socket-client";
import { useCurrentAccount } from "@/lib/auth-session";

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

    const unsubscribe = subscribeNotificationEvents(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [account?.id, queryClient]);
}
