import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommentAuthor, CommentNode, CommentThread } from "@/lib/mock-comments";
import {
  createDocumentReply,
  createDocumentThread,
  listDocumentThreads,
  setDocumentThreadResolved,
} from "@/api/adapters/comments";
import { useDocumentCommentRealtime } from "./use-document-comment-realtime";

export type CommentFilter = "open" | "resolved";

export type DocumentCommentCurrentUser = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
};

interface UseDocumentCommentsArgs {
  workspaceId: string;
  documentId: string;
  currentUser: DocumentCommentCurrentUser;
}

interface CreateThreadArgs {
  body: CommentNode[];
  anchorSnippet?: string | null;
}

function toAuthor(user: DocumentCommentCurrentUser): CommentAuthor {
  return {
    id: user.id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
  };
}

export function useDocumentComments({ workspaceId, documentId, currentUser }: UseDocumentCommentsArgs) {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [filter, setFilter] = useState<CommentFilter>("open");

  const refetchThreads = useCallback(() => {
    if (!workspaceId || !documentId) return Promise.resolve();
    return listDocumentThreads(workspaceId, documentId)
      .then(setThreads)
      .catch(() => setThreads([]));
  }, [workspaceId, documentId]);

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

  useDocumentCommentRealtime({
    workspaceId,
    documentId,
    currentUserId: currentUser.id,
    onRefetch: () => {
      void refetchThreads();
    },
  });

  const openCount = useMemo(() => threads.filter((t) => !t.resolved).length, [threads]);
  const resolvedCount = useMemo(() => threads.filter((t) => t.resolved).length, [threads]);

  const visibleThreads = useMemo(() => {
    const list = filter === "open" ? threads.filter((t) => !t.resolved) : threads.filter((t) => t.resolved);
    return [...list].sort((a, b) => {
      if (!!a.anchor !== !!b.anchor) return a.anchor ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [threads, filter]);

  const createThread = useCallback(
    ({ body, anchorSnippet }: CreateThreadArgs) => {
      const author = toAuthor(currentUser);
      const optimistic: CommentThread = {
        id: `tmp-${Date.now()}`,
        documentId,
        anchor: anchorSnippet ? { snippet: anchorSnippet, status: "ok" } : null,
        authorId: currentUser.id,
        author,
        body,
        createdAt: new Date().toISOString(),
        resolved: false,
        replies: [],
      };
      setThreads((prev) => [...prev, optimistic]);
      void createDocumentThread(workspaceId, documentId, body, anchorSnippet).then(() => refetchThreads());
      return optimistic;
    },
    [workspaceId, documentId, currentUser, refetchThreads],
  );

  const replyToThread = useCallback(
    (threadId: string, body: CommentNode[]) => {
      const author = toAuthor(currentUser);
      const optimisticReply = {
        id: `tmp-r-${Date.now()}`,
        authorId: currentUser.id,
        author,
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
      void createDocumentReply(workspaceId, threadId, body).then(() => refetchThreads());
    },
    [workspaceId, currentUser, refetchThreads],
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
            resolvedBy: currentUser.id,
          };
        }),
      );
      void setDocumentThreadResolved(workspaceId, threadId, nextResolved).then(() => refetchThreads());
    },
    [threads, workspaceId, currentUser.id, refetchThreads],
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
