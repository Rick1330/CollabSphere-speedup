import { SetMetadata } from "@nestjs/common";
import type { WorkspaceRole } from "@prisma/client";

export const WORKSPACE_ROLE_KEY = "workspaceRole";

/** @deprecated Use WORKSPACE_ROLE_KEY */
export const WORKSPACE_MIN_ROLE_KEY = WORKSPACE_ROLE_KEY;

/** Require at least this workspace role when `workspaceId` is present in route params. */
export const WorkspaceRoles = (role: WorkspaceRole) => SetMetadata(WORKSPACE_ROLE_KEY, role);

/** Alias for {@link WorkspaceRoles}. */
export const WorkspaceRoleAtLeast = WorkspaceRoles;
