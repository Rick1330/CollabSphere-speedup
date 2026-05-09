import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommentNode, CommentThread } from "@/lib/mock-comments";
import {
  createDocumentReply,
  createDocumentThread,
  listDocumentThreads,
  setDocumentThreadResolved,
} from "@/api/adapters/comments";

export type CommentFilter = "open" | "resolved";

interface UseDocumentCommentsArgs {
  workspaceId: string;
  documentId: string;
  currentUserId: string;
}

interface CreateThreadArgs {
  body: CommentNode[];
  anchorSnippet?: string | null;
}

export function useDocumentComments({ workspaceId, documentId, currentUserId }: UseDocumentCommentsArgs) {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [filter, setFilter] = useState<CommentFilter>("open");

  // Reset when switching documents
  useEffect(() => {
    let cancelled = false;
    if (!workspaceId || !documentId) {
      setThreads([]);
      return;
    }
    listDocumentThreads(workspaceId, documentId)
      .then((items) => {
        if (!cancelled) setThreads(items);
      })
      .catch(() => {
        if (!cancelled) setThreads([]);
      });
    setFilter("open");
    return () => {
      cancelled = true;
    };
  }, [workspaceId, documentId]);

  const openCount = useMemo(() => threads.filter((t) => !t.resolved).length, [threads]);
  const resolvedCount = useMemo(() => threads.filter((t) => t.resolved).length, [threads]);

  const visibleThreads = useMemo(() => {
    const list = filter === "open" ? threads.filter((t) => !t.resolved) : threads.filter((t) => t.resolved);
    // Sort: anchored first (top-down by document), then general, newest last
    return [...list].sort((a, b) => {
      if (!!a.anchor !== !!b.anchor) return a.anchor ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [threads, filter]);

  const createThread = useCallback(
    ({ body, anchorSnippet }: CreateThreadArgs) => {
      const optimistic: CommentThread = {
        id: `tmp-${Date.now()}`,
        documentId,
        anchor: anchorSnippet ? { snippet: anchorSnippet, status: "ok" } : null,
        authorId: currentUserId,
        body,
        createdAt: new Date().toISOString(),
        resolved: false,
        replies: [],
      };
      setThreads((prev) => [...prev, optimistic]);
      void createDocumentThread(workspaceId, documentId, body, anchorSnippet).then(() => {
        void listDocumentThreads(workspaceId, documentId).then(setThreads);
      });
      return optimistic;
    },
    [workspaceId, documentId, currentUserId],
  );

  const replyToThread = useCallback(
    (threadId: string, body: CommentNode[]) => {
      const optimisticReply = {
        id: `tmp-r-${Date.now()}`,
        authorId: currentUserId,
        body,
        createdAt: new Date().toISOString(),
      };
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                replies: [...t.replies, optimisticReply],
              }
            : t,
        ),
      );
      void createDocumentReply(workspaceId, threadId, body).then(() => {
        void listDocumentThreads(workspaceId, documentId).then(setThreads);
      });
    },
    [workspaceId, documentId, currentUserId],
  );

  const toggleResolve = useCallback(
    (threadId: string) => {
      const thread = threads.find((item) => item.id === threadId);
      const nextResolved = !thread?.resolved;
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          if (nextResolved === false) {
            return { ...t, resolved: false, resolvedAt: undefined, resolvedBy: undefined };
          }
          return {
            ...t,
            resolved: true,
            resolvedAt: new Date().toISOString(),
            resolvedBy: currentUserId,
          };
        }),
      );
      void setDocumentThreadResolved(workspaceId, threadId, nextResolved).then(() => {
        void listDocumentThreads(workspaceId, documentId).then(setThreads);
      });
    },
    [threads, workspaceId, documentId, currentUserId],
  );

  return {
    threads,
    visibleThreads,
    filter,
    setFilter,
    openCount,
    resolvedCount,
    createThread,
    replyToThread,
    toggleResolve,
  };
}
