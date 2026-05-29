/**
 * BullMQ queue and job type contracts for worker, API, and scheduler services.
 */
export const Queues = {
  EMAIL: "email",
  EXPORT: "export",
  DOCX_IMPORT: "docx-imports",
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
  IMPORT_DOCX_HTML: "import.document.docx.html",
  INDEX_DOCUMENT: "search.document.index",
  INDEX_TASK: "search.task.index",
  PURGE_EXPIRED_TOKENS: "maintenance.tokens.purge",
  EXPIRE_INVITATIONS: "maintenance.invitations.expire",
  PURGE_SOFT_DELETED: "maintenance.entities.purge",
  PURGE_OLD_NOTIFICATIONS: "maintenance.notifications.purge",
  VERSION_SNAPSHOT: "document.version.snapshot",
} as const;

export type JobTypeName = (typeof JobTypes)[keyof typeof JobTypes];

export interface ExportPageSetup {
  format: "letter" | "a4" | "legal";
  orientation: "portrait" | "landscape";
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ExportJobData {
  exportJobId: string;
  documentId: string;
  workspaceId: string;
  requestedBy: string;
  format: "pdf" | "markdown";
  pageSetup?: ExportPageSetup;
}

export interface ImportDocxJobData {
  importJobId: string;
  workspaceId: string;
  documentId: string;
  actorUserId: string;
  inputPath: string;
}

export type JobPayloadByType = {
  [JobTypes.EXPORT_PDF]: ExportJobData;
  [JobTypes.EXPORT_MARKDOWN]: ExportJobData;
  [JobTypes.IMPORT_DOCX_HTML]: ImportDocxJobData;
};
