import { documentTreeQueryKey } from "@/features/documents/hooks/use-document-tree";

export const queryKeys = {
  workspaces: {
    mine: () => ["workspaces", "mine"] as const,
    members: (workspaceId: string) => ["workspace", workspaceId, "members"] as const,
    detail: (workspaceId: string) => ["workspace", workspaceId, "shell"] as const,
  },
  documents: {
    tree: (workspaceId: string) => documentTreeQueryKey(workspaceId),
    detail: (workspaceId: string, documentId: string) =>
      ["workspace", workspaceId, "documents", documentId] as const,
  },
  tasks: {
    board: (workspaceId: string) => ["workspace", workspaceId, "tasks", "board"] as const,
    detail: (workspaceId: string, taskId: string) =>
      ["workspace", workspaceId, "tasks", taskId] as const,
  },
  comments: {
    threads: (workspaceId: string, targetType: string, targetId: string) =>
      ["workspace", workspaceId, "comments", targetType, targetId] as const,
    thread: (workspaceId: string, threadId: string) =>
      ["workspace", workspaceId, "comments", "thread", threadId] as const,
  },
  activity: {
    workspace: (workspaceId: string) => ["workspace", workspaceId, "activity"] as const,
    dashboard: () => ["dashboard", "activity"] as const,
  },
  review: {
    queue: () => ["review-queue"] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
  },
  workspaceHome: {
    all: (workspaceId: string) => ["workspace-home", workspaceId] as const,
    tree: (workspaceId: string) => ["workspace-home", workspaceId, "tree"] as const,
    tasks: (workspaceId: string) => ["workspace-home", workspaceId, "tasks"] as const,
    activity: (workspaceId: string) => ["workspace-home", workspaceId, "activity"] as const,
  },
} as const;
