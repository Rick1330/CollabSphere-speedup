/** EventEmitter2 domain event payloads consumed by RealtimeListener. */

export type WorkspaceUpdatedPayload = {
  workspaceId: string;
  changes?: Record<string, unknown>;
};

export type WorkspaceArchivedPayload = {
  workspaceId: string;
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

export type WorkspaceMemberRoleChangedPayload = {
  workspaceId: string;
  userId: string;
  newRole: string;
  oldRole?: string;
};

export type WorkspaceSettingsUpdatedPayload = {
  workspaceId: string;
  settings?: Record<string, unknown>;
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
  fromStatus?: string;
  toStatus: string;
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

export type TaskStatusChangedPayload = {
  workspaceId: string;
  taskId: string;
  toStatus: string;
  fromStatus?: string;
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

export type CommentDeletedPayload = {
  workspaceId: string;
  threadId: string;
  commentId: string;
};

export type CommentThreadResolvedPayload = {
  workspaceId: string;
  threadId: string;
  resolvedById: string;
};

export type ActivityRecordedPayload = {
  workspaceId: string;
  activityEvent: Record<string, unknown>;
};

export type ExportCompletedPayload = {
  userId: string;
  exportJobId: string;
  fileUrl: string;
};
