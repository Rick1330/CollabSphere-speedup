import type { WorkspaceMemberRole } from "./document-write-policy.js";

const createRoles = new Set<WorkspaceMemberRole>([
  "OWNER",
  "ADMIN",
  "MANAGER",
  "MEMBER",
]);

const organizeRoles = new Set<WorkspaceMemberRole>([
  "OWNER",
  "ADMIN",
  "MANAGER",
  "MEMBER",
]);

const deleteRoles = new Set<WorkspaceMemberRole>(["OWNER", "ADMIN", "MANAGER"]);

/** MEMBER+ may create folders and documents. */
export function canCreateWorkspaceContent(role: WorkspaceMemberRole): boolean {
  return createRoles.has(role);
}

/** MEMBER+ may rename or move folders and documents. */
export function canOrganizeWorkspaceContent(role: WorkspaceMemberRole): boolean {
  return organizeRoles.has(role);
}

/** MANAGER+ may delete folders and draft documents. */
export function canDeleteWorkspaceContent(role: WorkspaceMemberRole): boolean {
  return deleteRoles.has(role);
}
