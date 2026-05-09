export type DocumentWriteStatus = "draft" | "submitted" | "changes_requested" | "approved" | "archived";
export type WorkspaceMemberRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

const readOnlyStatuses = new Set<DocumentWriteStatus>(["submitted", "approved", "archived"]);
const managerRoles = new Set<WorkspaceMemberRole>(["OWNER", "ADMIN", "MANAGER"]);

export const isDocumentReadOnly = (input: {
  status: DocumentWriteStatus;
  isLocked: boolean;
  role: WorkspaceMemberRole;
}) => input.isLocked || readOnlyStatuses.has(input.status) || input.role === "VIEWER";

export const canManageLocks = (role: WorkspaceMemberRole) => managerRoles.has(role);
