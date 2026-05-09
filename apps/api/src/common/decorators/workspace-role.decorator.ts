import { SetMetadata } from "@nestjs/common";
import type { WorkspaceRole } from "@prisma/client";

export const WORKSPACE_MIN_ROLE_KEY = "collabsphere:workspaceMinRole";

/** Require at least this workspace role (inclusive) when `workspaceId` is present in route params. */
export const WorkspaceRoleAtLeast = (role: WorkspaceRole) =>
  SetMetadata(WORKSPACE_MIN_ROLE_KEY, role);
