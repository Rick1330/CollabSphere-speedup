import { request } from "@/api/client";
import type { CommentNode, CommentReply, CommentThread } from "@/lib/mock-comments";

type SingleEnvelope<TResource> = {
  data?: {
    resource?: TResource;
  };
};

type ApiComment = {
  id: string;
  authorId?: string | null;
  content?: CommentNode[];
  createdAt: string;
};

type ApiThread = {
  id: string;
  status: "open" | "resolved";
  targetType: "document" | "task";
  targetId: string;
  anchor?: { snippet?: string; status?: "ok" | "changed" } | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  createdById: string;
  comments?: ApiComment[];
};

const parseSingleEnvelope = <T,>(payload: unknown): T => {
  const resource = (payload as SingleEnvelope<T> | null | undefined)?.data?.resource;
  if (!resource) {
    throw new Error("Invalid API single-resource envelope.");
  }
  return resource;
};

const mapThread = (documentId: string, thread: ApiThread): CommentThread => {
  const comments = [...(thread.comments ?? [])].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  const root = comments[0];
  const replies: CommentReply[] = comments.slice(1).map((comment) => ({
    id: comment.id,
    authorId: comment.authorId ?? "unknown",
    body: Array.isArray(comment.content) ? comment.content : [],
    createdAt: comment.createdAt,
  }));
  return {
    id: thread.id,
    documentId,
    anchor: thread.anchor?.snippet ? { snippet: thread.anchor.snippet, status: thread.anchor.status ?? "ok" } : null,
    authorId: root?.authorId ?? thread.createdById,
    body: Array.isArray(root?.content) ? root.content : [],
    createdAt: root?.createdAt ?? new Date().toISOString(),
    resolved: thread.status === "resolved",
    resolvedAt: thread.resolvedAt ?? undefined,
    resolvedBy: thread.resolvedById ?? undefined,
    replies,
  };
};

export async function listDocumentThreads(workspaceId: string, documentId: string): Promise<CommentThread[]> {
  const payload = await request<unknown>(
    `/workspaces/${workspaceId}/comments?targetType=document&targetId=${encodeURIComponent(documentId)}`,
  );
  const resource = parseSingleEnvelope<{ threads?: ApiThread[] }>(payload);
  return (resource.threads ?? []).map((thread) => mapThread(documentId, thread));
}

export async function createDocumentThread(
  workspaceId: string,
  documentId: string,
  body: CommentNode[],
  anchorSnippet?: string | null,
): Promise<void> {
  await request(
    `/workspaces/${workspaceId}/comments/threads?targetType=document&targetId=${encodeURIComponent(documentId)}`,
    {
      method: "POST",
      body: {
        content: body,
        anchor: anchorSnippet
          ? {
              snippet: anchorSnippet,
              status: "ok",
            }
          : null,
      },
    },
  );
}

export async function createDocumentReply(workspaceId: string, threadId: string, body: CommentNode[]): Promise<void> {
  await request(`/workspaces/${workspaceId}/comments/threads/${threadId}/replies`, {
    method: "POST",
    body: { content: body },
  });
}

export async function setDocumentThreadResolved(
  workspaceId: string,
  threadId: string,
  resolved: boolean,
): Promise<void> {
  await request(`/workspaces/${workspaceId}/comments/threads/${threadId}/resolve`, {
    method: "PATCH",
    body: { resolved },
  });
}
