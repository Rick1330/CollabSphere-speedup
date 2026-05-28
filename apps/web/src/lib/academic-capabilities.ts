import type { WorkspaceRole } from "@/api/adapters/members";

export type WorkspaceType = "academic" | "professional" | "general";

export function isAcademicWorkspace(type: WorkspaceType | undefined | null): boolean {
  return type === "academic";
}

export function canReviewAcademic(params: {
  workspaceType: WorkspaceType | undefined | null;
  myRole: WorkspaceRole | undefined | null;
}): boolean {
  // Policy: reviewers are MANAGER only (academic workspaces only).
  return params.workspaceType === "academic" && params.myRole === "MANAGER";
}

export function canSubmitAcademic(params: {
  workspaceType: WorkspaceType | undefined | null;
  myRole: WorkspaceRole | undefined | null;
  canCreateContent: boolean | undefined | null;
}): boolean {
  // Policy: any non-VIEWER editor can submit (academic workspaces only).
  return (
    params.workspaceType === "academic" &&
    params.myRole !== "VIEWER" &&
    Boolean(params.canCreateContent)
  );
}

