/**
 * Workspace role-label mapping.
 *
 * Distinguishes **permission roles** (the canonical 5-tuple OWNER/ADMIN/
 * MANAGER/MEMBER/VIEWER) from **display labels** (what the UI shows the
 * user — "Tech Lead", "Stakeholder", "Advisor", "Student", etc.) which
 * vary by workspace type / template.
 *
 * Permission roles drive policy. Display labels drive UI text only.
 */

import type { WorkspaceRole } from "@/api/adapters/members";

export type WorkspaceTypeForLabels = "professional" | "academic" | "general";

/**
 * Default role-label map per workspace type. Workspaces can override
 * specific labels per-membership (the existing `roleLabel` field on
 * `WorkspaceMember`); when not overridden, this provides the truthful
 * default for the workspace type.
 */
const TYPE_LABEL_MAP: Record<WorkspaceTypeForLabels, Record<WorkspaceRole, string>> = {
  professional: {
    OWNER: "OWNER",
    ADMIN: "TECH LEAD",
    MANAGER: "PROJECT MANAGER",
    MEMBER: "MEMBER",
    VIEWER: "STAKEHOLDER",
  },
  academic: {
    OWNER: "INSTRUCTOR",
    ADMIN: "ADVISOR",
    MANAGER: "SUPERVISOR",
    MEMBER: "STUDENT",
    VIEWER: "AUDITOR",
  },
  general: {
    OWNER: "OWNER",
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    MEMBER: "MEMBER",
    VIEWER: "VIEWER",
  },
};

export function getWorkspaceRoleLabel(
  workspaceType: WorkspaceTypeForLabels,
  role: WorkspaceRole,
): string {
  return TYPE_LABEL_MAP[workspaceType]?.[role] ?? role;
}

/**
 * Resolve the alias displayed in domain-specific contexts. The persona
 * "SUPERVISOR" is a domain alias; on the permission layer it maps to
 * MANAGER (academic workspaces) or ADMIN (research workspaces) and is
 * displayed as "Advisor" / "Reviewer" depending on the template.
 */
export function getSupervisorAlias(workspaceType: WorkspaceTypeForLabels): string {
  if (workspaceType === "academic") return "ADVISOR";
  return "REVIEWER";
}

export function getWorkspaceRoleDescription(
  workspaceType: WorkspaceTypeForLabels,
  role: WorkspaceRole,
): string {
  if (workspaceType === "academic") {
    switch (role) {
      case "OWNER":
      case "ADMIN":
        return "Lead instructor controls grading flow, membership, and workspace policy.";
      case "MANAGER":
        return "Supervisor/advisor can guide reviews, assign tasks, and moderate submissions.";
      case "MEMBER":
        return "Student can submit work, collaborate on documents, and complete tasks.";
      case "VIEWER":
        return "Observer can review activity and read artifacts without editing.";
    }
  }

  if (workspaceType === "professional") {
    switch (role) {
      case "OWNER":
        return "Workspace owner with full governance, billing, and transfer rights.";
      case "ADMIN":
        return "Tech lead/admin can manage team membership and workspace settings.";
      case "MANAGER":
        return "Manager can coordinate delivery, assign work, and review outcomes.";
      case "MEMBER":
        return "Contributor can create and edit documents/tasks.";
      case "VIEWER":
        return "Stakeholder has read-only visibility.";
    }
  }

  switch (role) {
    case "OWNER":
      return "Full control including ownership transfer and workspace deletion.";
    case "ADMIN":
      return "Can manage workspace settings, members, and all content.";
    case "MANAGER":
      return "Can manage tasks, assign work, and review documents.";
    case "MEMBER":
      return "Can create and edit documents and tasks.";
    case "VIEWER":
      return "Can view all content but cannot edit or create.";
  }
}
