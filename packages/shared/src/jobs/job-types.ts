/**
 * BullMQ queue and job type contracts for worker, API, and scheduler services.
 */
export const Queues = {
  EMAIL: "email",
  EXPORT: "export",
  MAINTENANCE: "maintenance",
  SEARCH_INDEX: "search-index",
} as const;

export type QueueName = (typeof Queues)[keyof typeof Queues];

export const JobTypes = {
  EMAIL_VERIFICATION: "email.verification.send",
  EMAIL_PASSWORD_RESET: "email.password-reset.send",
  EMAIL_INVITATION: "email.invitation.send",
  EMAIL_NOTIFICATION: "email.notification.send",
  EXPORT_PDF: "export.document.pdf",
  EXPORT_MARKDOWN: "export.document.markdown",
  INDEX_DOCUMENT: "search.document.index",
  INDEX_TASK: "search.task.index",
  PURGE_EXPIRED_TOKENS: "maintenance.tokens.purge",
  EXPIRE_INVITATIONS: "maintenance.invitations.expire",
  PURGE_SOFT_DELETED: "maintenance.entities.purge",
  PURGE_OLD_NOTIFICATIONS: "maintenance.notifications.purge",
  VERSION_SNAPSHOT: "document.version.snapshot",
} as const;

export type JobTypeName = (typeof JobTypes)[keyof typeof JobTypes];

export interface EmailVerificationJobData {
  userId: string;
  email: string;
  verificationToken: string;
  fullName: string;
}

export interface EmailPasswordResetJobData {
  userId: string;
  email: string;
  resetToken: string;
  fullName: string;
}

export interface EmailInvitationJobData {
  invitationId: string;
  workspaceId: string;
  email: string;
  inviterName: string;
  workspaceName: string;
  token: string;
}

export interface EmailNotificationJobData {
  recipientId: string;
  notificationId: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
}

export interface ExportJobData {
  exportJobId: string;
  documentId: string;
  workspaceId: string;
  requestedBy: string;
  format: "pdf" | "markdown";
}

export interface IndexDocumentJobData {
  documentId: string;
  workspaceId: string;
}

export interface IndexTaskJobData {
  taskId: string;
  workspaceId: string;
}

export interface PurgeExpiredTokensJobData {
  batchSize?: number;
}

export interface ExpireInvitationsJobData {
  batchSize?: number;
}

export interface PurgeSoftDeletedJobData {
  olderThanDays: number;
  batchSize?: number;
}

export interface PurgeOldNotificationsJobData {
  olderThanDays: number;
  batchSize?: number;
}

export type VersionSnapshotReason = "auto" | "manual" | "submitted" | "approved" | "before_restore";

export interface VersionSnapshotJobData {
  documentId: string;
  workspaceId: string;
  triggeredBy: string;
  reason: VersionSnapshotReason;
}

export type JobPayloadByType = {
  [JobTypes.EMAIL_VERIFICATION]: EmailVerificationJobData;
  [JobTypes.EMAIL_PASSWORD_RESET]: EmailPasswordResetJobData;
  [JobTypes.EMAIL_INVITATION]: EmailInvitationJobData;
  [JobTypes.EMAIL_NOTIFICATION]: EmailNotificationJobData;
  [JobTypes.EXPORT_PDF]: ExportJobData;
  [JobTypes.EXPORT_MARKDOWN]: ExportJobData;
  [JobTypes.INDEX_DOCUMENT]: IndexDocumentJobData;
  [JobTypes.INDEX_TASK]: IndexTaskJobData;
  [JobTypes.PURGE_EXPIRED_TOKENS]: PurgeExpiredTokensJobData;
  [JobTypes.EXPIRE_INVITATIONS]: ExpireInvitationsJobData;
  [JobTypes.PURGE_SOFT_DELETED]: PurgeSoftDeletedJobData;
  [JobTypes.PURGE_OLD_NOTIFICATIONS]: PurgeOldNotificationsJobData;
  [JobTypes.VERSION_SNAPSHOT]: VersionSnapshotJobData;
};

export interface TypedJob<T extends JobTypeName = JobTypeName> {
  type: T;
  queue: QueueName;
  data: JobPayloadByType[T];
}
