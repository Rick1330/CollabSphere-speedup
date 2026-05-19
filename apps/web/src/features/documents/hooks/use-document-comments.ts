import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import type { CommentAuthor, CommentNode, CommentThread } from "@/lib/mock-comments";
import {
  createDocumentReply,
  createDocumentThread,
  listDocumentThreads,
  setDocumentThreadResolved,
} from "@/api/adapters/comments";
import { queryKeys } from "@/lib/query-keys";
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
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<CommentFilter>("open");

  const threadsQueryKey = queryKeys.comments.threads(workspaceId, "document", documentId);

  const threadsQuery = useQuery({
    queryKey: threadsQueryKey,
    queryFn: () => listDocumentThreads(workspaceId, documentId),
    enabled: Boolean(workspaceId && documentId),
  });

  const threads = threadsQuery.data ?? [];

  const patchThreads = useCallback(
    (updater: (prev: CommentThread[]) => CommentThread[]) => {
      queryClient.setQueryData<CommentThread[]>(threadsQueryKey, (prev) =>
        updater(prev ?? []),
      );
    },
    [queryClient, threadsQueryKey],
  );

  const refetchThreads = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: threadsQueryKey });
  }, [queryClient, threadsQueryKey]);

  useDocumentCommentRealtime({
    workspaceId,
    documentId,
    currentUserId: currentUser.id,
    onRefetch: refetchThreads,
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
      const previous = queryClient.getQueryData<CommentThread[]>(threadsQueryKey) ?? [];
      patchThreads((prev) => [...prev, optimistic]);
      void createDocumentThread(workspaceId, documentId, body, anchorSnippet)
        .then(() => refetchThreads())
        .catch((error: unknown) => {
          // #region agent log
          fetch("http://127.0.0.1:7352/ingest/38fbd051-1833-4296-ab67-281907013a27", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "833b60",
            },
            body: JSON.stringify({
              sessionId: "833b60",
              runId: "pre-fix",
              hypothesisId: "H",
              location: "use-document-comments.ts:createThread",
              message: "createDocumentThread failed",
              data: {
                code: error instanceof ApiError ? error.code : "unknown",
                apiMessage: error instanceof ApiError ? error.message : String(error),
              },
              timestamp: Date.now(),
            }),
          }).catch(() => undefined);
          // #endregion
          queryClient.setQueryData(threadsQueryKey, previous);
          const message =
            error instanceof ApiError ? error.message : "Could not post comment.";
          toast.error(message);
        });
      return optimistic;
    },
    [workspaceId, documentId, currentUser, patchThreads, refetchThreads, queryClient, threadsQueryKey],
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
      const previous = queryClient.getQueryData<CommentThread[]>(threadsQueryKey) ?? [];
      patchThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                replies: [...t.replies, optimisticReply],
              }
            : t,
        ),
      );
      void createDocumentReply(workspaceId, threadId, body)
        .then(() => refetchThreads())
        .catch((error: unknown) => {
          queryClient.setQueryData(threadsQueryKey, previous);
          const message =
            error instanceof ApiError ? error.message : "Could not post reply.";
          toast.error(message);
        });
    },
    [workspaceId, currentUser, patchThreads, refetchThreads, queryClient, threadsQueryKey],
  );

  const toggleResolve = useCallback(
    (threadId: string) => {
      const thread = threads.find((item) => item.id === threadId);
      const nextResolved = !thread?.resolved;
      const previous = queryClient.getQueryData<CommentThread[]>(threadsQueryKey) ?? [];
      patchThreads((prev) =>
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
      void setDocumentThreadResolved(workspaceId, threadId, nextResolved)
        .then(() => refetchThreads())
        .catch((error: unknown) => {
          queryClient.setQueryData(threadsQueryKey, previous);
          const message =
            error instanceof ApiError
              ? error.message
              : "Could not update thread status.";
          toast.error(message);
        });
    },
    [threads, workspaceId, currentUser.id, patchThreads, refetchThreads, queryClient, threadsQueryKey],
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
    isLoading: threadsQuery.isLoading,
    isError: threadsQuery.isError,
  };
}
