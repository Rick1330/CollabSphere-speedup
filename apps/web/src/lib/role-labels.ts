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

export type WorkspaceRoleLabelsMap = Partial<Record<WorkspaceRole, string>>;

/**
 * Default role-label map per workspace type. Workspaces can override
 * specific labels via `settings.roleLabels` from the template.
 */
const TYPE_LABEL_MAP: Record<WorkspaceTypeForLabels, Record<WorkspaceRole, string>> = {
  professional: {
    OWNER: "Owner",
    ADMIN: "Tech Lead",
    MANAGER: "Project Manager",
    MEMBER: "Developer",
    VIEWER: "Stakeholder",
  },
  academic: {
    OWNER: "Instructor",
    ADMIN: "Advisor",
    MANAGER: "Supervisor",
    MEMBER: "Student",
    VIEWER: "Reviewer",
  },
  general: {
    OWNER: "Owner",
    ADMIN: "Admin",
    MANAGER: "Manager",
    MEMBER: "Member",
    VIEWER: "Viewer",
  },
};

export function getWorkspaceRoleLabel(
  workspaceType: WorkspaceTypeForLabels,
  role: WorkspaceRole,
  roleLabels?: WorkspaceRoleLabelsMap,
): string {
  const fromSettings = roleLabels?.[role]?.trim();
  if (fromSettings) return fromSettings;
  return TYPE_LABEL_MAP[workspaceType]?.[role] ?? role;
}

/** True when the workspace template labels OWNER as a lead persona (e.g. Supervisor). */
export function isOwnerLeadPersonaLabel(roleLabels?: WorkspaceRoleLabelsMap): boolean {
  const ownerLabel = roleLabels?.OWNER?.trim().toLowerCase() ?? "";
  return (
    ownerLabel.includes("supervisor") ||
    ownerLabel.includes("instructor") ||
    ownerLabel.includes("advisor") ||
    ownerLabel.includes("project manager")
  );
}

export function getOwnerRoleInviteHint(roleLabels?: WorkspaceRoleLabelsMap): string | null {
  if (!isOwnerLeadPersonaLabel(roleLabels)) return null;
  const ownerLabel = roleLabels?.OWNER ?? "Owner";
  const adminLabel = roleLabels?.ADMIN ?? "Admin";
  const managerLabel = roleLabels?.MANAGER ?? "Manager";
  return `The workspace creator holds the ${ownerLabel} role. Invite additional leads as ${adminLabel} or ${managerLabel}.`;
}

export function getWorkspaceRoleDescription(
  workspaceType: WorkspaceTypeForLabels,
  role: WorkspaceRole,
  roleLabels?: WorkspaceRoleLabelsMap,
): string {
  const label = getWorkspaceRoleLabel(workspaceType, role, roleLabels).toLowerCase();

  if (workspaceType === "academic") {
    switch (role) {
      case "OWNER":
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} controls grading flow, membership, and workspace policy.`;
      case "ADMIN":
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} can support instruction, manage members, and moderate content.`;
      case "MANAGER":
        if (label.includes("lead") || label.includes("supervisor")) {
          return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} can guide reviews, assign tasks, and coordinate submissions.`;
        }
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} can guide reviews, assign tasks, and moderate submissions.`;
      case "MEMBER":
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} can submit work, collaborate on documents, and complete tasks.`;
      case "VIEWER":
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} can review activity and read artifacts without editing.`;
    }
  }

  if (workspaceType === "professional") {
    switch (role) {
      case "OWNER":
        return "Workspace owner with full governance and transfer rights.";
      case "ADMIN":
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} can manage team membership and workspace settings.`;
      case "MANAGER":
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} can coordinate delivery, assign work, and review outcomes.`;
      case "MEMBER":
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} can create and edit documents and tasks.`;
      case "VIEWER":
        return `${getWorkspaceRoleLabel(workspaceType, role, roleLabels)} has read-only visibility.`;
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
