import { authSession } from "@/lib/auth-session";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";

export const DEFAULT_WORKSPACE_ID = "alpha";
export const DEFAULT_DOCUMENT_ID = "d-api";
export const DEFAULT_TASK_ID = "task-1";

export const isPlaceholderParam = (value?: string | null) =>
  !value || value.startsWith(":");

/**
 * Resolves `/w/:workspaceId` for API calls. Non-UUID slugs (legacy demos, `alpha`)
 * map to the signed-in user's default workspace UUID when available.
 */
export const resolveWorkspaceParam = (
  value?: string | null,
  sessionDefaultWorkspaceId?: string | null,
): string => {
  if (isPlaceholderParam(value)) return DEFAULT_WORKSPACE_ID;
  const v = value.trim();
  if (isDatabaseWorkspaceId(v)) return v;
  const fromArg = sessionDefaultWorkspaceId?.trim();
  if (fromArg && isDatabaseWorkspaceId(fromArg)) return fromArg;
  const fromStore = authSession.get()?.defaultWorkspaceId?.trim();
  if (fromStore && isDatabaseWorkspaceId(fromStore)) return fromStore;
  return v;
};

export const resolveDocumentParam = (value?: string | null) =>
  isPlaceholderParam(value) ? DEFAULT_DOCUMENT_ID : value;

export const resolveTaskParam = (value?: string | null) =>
  isPlaceholderParam(value) ? DEFAULT_TASK_ID : value;
