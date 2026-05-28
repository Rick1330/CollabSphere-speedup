/** Socket.IO payload shapes emitted by `RealtimeListener` (workspace room). */

import type { WorkspaceRole } from "@/api/adapters/members";

export type WorkspaceRoleChangedPayload = {
  workspaceId: string;
  userId: string;
  newRole: WorkspaceRole;
  oldRole?: WorkspaceRole;
};

export type WorkspaceMemberJoinedPayload = {
  workspaceId: string;
  userId: string;
  role: string;
};

export type WorkspaceMemberRemovedPayload = {
  workspaceId: string;
  userId: string;
};

export type WorkspaceSettingsUpdatedPayload = {
  workspaceId: string;
  settings: Record<string, unknown>;
};

export type WorkspaceArchivedPayload = {
  workspaceId: string;
};

export type DocumentCreatedPayload = {
  workspaceId: string;
  documentId: string;
  folderId?: string | null;
  title?: string;
};

export type DocumentStatusChangedPayload = {
  workspaceId: string;
  documentId: string;
  toStatus: string;
  fromStatus?: string;
};

export type DocumentLockedPayload = {
  workspaceId: string;
  documentId: string;
  lockedById: string;
};

export type DocumentUnlockedPayload = {
  workspaceId: string;
  documentId: string;
};

export type DocumentSubmittedPayload = {
  workspaceId: string;
  documentId: string;
  submittedById: string;
};

export type DocumentApprovedPayload = {
  workspaceId: string;
  documentId: string;
  approvedById: string;
};

export type SubmissionCreatedPayload = {
  workspaceId: string;
  documentId: string;
  submissionId: string;
  submittedById: string;
  submittedAt: string;
};

export type SubmissionUpdatedPayload = {
  workspaceId: string;
  documentId: string;
  submissionId: string;
  decision: "approved" | "changes_requested";
  decidedById: string;
  decidedAt: string;
};

export type TaskCreatedPayload = {
  workspaceId: string;
  taskId: string;
  status: string;
};

export type TaskMovedPayload = {
  workspaceId: string;
  taskId: string;
  toStatus: string;
  position?: number;
};

export type TaskAssignedPayload = {
  workspaceId: string;
  taskId: string;
  assigneeId: string | null;
};

export type TaskDeletedPayload = {
  workspaceId: string;
  taskId: string;
};

export type TaskCompletedPayload = {
  workspaceId: string;
  taskId: string;
};

export type CommentCreatedPayload = {
  workspaceId: string;
  threadId: string;
  commentId?: string;
  targetType: string;
  targetId: string;
  authorId: string;
};

export type CommentUpdatedPayload = {
  workspaceId: string;
  threadId: string;
  commentId: string;
};

export type CommentThreadResolvedPayload = {
  workspaceId: string;
  threadId: string;
  resolvedById: string;
};

export type ActivityNewPayload = {
  workspaceId: string;
  event: Record<string, unknown>;
};

export function workspacePayload<T extends { workspaceId?: string }>(
  workspaceId: string,
  payload: unknown,
): T | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as T;
  if (data.workspaceId && data.workspaceId !== workspaceId) return null;
  return data;
}
