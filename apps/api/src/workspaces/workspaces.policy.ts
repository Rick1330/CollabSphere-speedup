import type { WorkspaceRole } from "@prisma/client";

const roleRank: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
  VIEWER: 0,
};

const adminAssignableRoles = new Set<WorkspaceRole>(["MANAGER", "MEMBER", "VIEWER"]);
const ownerAssignableRoles = new Set<WorkspaceRole>(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]);

export const canManageMember = ({
  actorRole,
  targetRole,
}: {
  actorRole: WorkspaceRole;
  targetRole: WorkspaceRole;
}) => {
  if (actorRole === "OWNER") {
    return targetRole !== "OWNER";
  }

  if (actorRole === "ADMIN") {
    return roleRank[targetRole] < roleRank.ADMIN;
  }

  return false;
};

export const canAssignRole = ({
  actorRole,
  targetRole,
}: {
  actorRole: WorkspaceRole;
  targetRole: WorkspaceRole;
}) => {
  if (targetRole === "OWNER") {
    return false;
  }

  if (actorRole === "OWNER") {
    return ownerAssignableRoles.has(targetRole);
  }

  if (actorRole === "ADMIN") {
    return adminAssignableRoles.has(targetRole);
  }

  return false;
};
