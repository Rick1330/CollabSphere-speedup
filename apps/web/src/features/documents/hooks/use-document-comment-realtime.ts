import { useEffect, useRef } from "react";
import {
  ensureRealtimeConnected,
  joinWorkspaceRoom,
  subscribeCommentEvents,
  type CommentRealtimeEvent,
} from "@/api/realtime/socket-client";

const DOCUMENT_COMMENT_EVENTS = new Set<CommentRealtimeEvent>([
  "comment:created",
  "comment:updated",
  "comment:thread_resolved",
]);

type CommentEventPayload = {
  workspaceId?: string;
  targetType?: string;
  targetId?: string;
  threadId?: string;
  commentId?: string;
  authorId?: string;
  resolvedById?: string;
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
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

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
        void joinWorkspaceRoom(workspaceId).catch(() => undefined);
        unsubscribe = subscribeCommentEvents((event: CommentRealtimeEvent, payload: unknown) => {
          if (!DOCUMENT_COMMENT_EVENTS.has(event)) return;
          const data = payload as CommentEventPayload;
          if (data?.workspaceId && data.workspaceId !== workspaceId) return;
          if (data?.targetType !== "document" || data?.targetId !== documentId) return;

          const selfId = currentUserIdRef.current;
          if (event === "comment:created" && data.authorId === selfId) return;
          if (event === "comment:thread_resolved" && data.resolvedById === selfId) return;

          scheduleRefetch();
        });
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
