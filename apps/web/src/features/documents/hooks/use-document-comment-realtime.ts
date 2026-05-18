import { useEffect, useRef } from "react";
import {
  ensureRealtimeConnected,
  subscribeCommentEvents,
  type CommentRealtimeEvent,
} from "@/api/realtime/socket-client";

type CommentEventPayload = {
  targetType?: string;
  targetId?: string;
  threadId?: string;
  commentId?: string;
};

export function useDocumentCommentRealtime({
  workspaceId,
  documentId,
  currentUserId,
  onRefetch,
}: {
  workspaceId: string;
  documentId: string;
  currentUserId: string;
  onRefetch: () => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefetchRef = useRef(onRefetch);
  onRefetchRef.current = onRefetch;

  useEffect(() => {
    if (!workspaceId || !documentId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const scheduleRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onRefetchRef.current();
      }, 150);
    };

    void ensureRealtimeConnected()
      .then(() => {
        if (cancelled) return;
        unsubscribe = subscribeCommentEvents(
          (_event: CommentRealtimeEvent, payload: unknown) => {
            const data = payload as CommentEventPayload;
            if (data?.targetType !== "document" || data?.targetId !== documentId) {
              return;
            }
            scheduleRefetch();
          },
        );
      })
      .catch(() => {
        /* page-level connection status handles failures */
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [workspaceId, documentId, currentUserId]);
}
