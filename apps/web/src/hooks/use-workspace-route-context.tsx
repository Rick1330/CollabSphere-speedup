import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchWorkspaceSidebarContext } from "@/api/adapters/workspaces";
import type { WorkspaceForSidebar } from "@/features/workspace/components/workspace-sidebar";
import type { WorkspaceRole } from "@/api/adapters/members";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";
import { ApiError } from "@/api/client";
import { useWorkspaceRealtime } from "@/hooks/use-workspace-realtime";

export interface WorkspaceRouteContextValue {
  workspaceId: string;
  sidebar: WorkspaceForSidebar | undefined;
  myRole: WorkspaceRole | undefined;
  isLoading: boolean;
  isError: boolean;
  /** True when the API rejected access for this workspace (not a member, etc.). */
  accessDenied: boolean;
  error: unknown;
  refetch: () => void;
}

function isAccessDeniedError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NOT_WORKSPACE_MEMBER";
}

/**
 * Canonical workspace-route shell: resolves `/w/:workspaceId` against the API
 * so sidebar + permissions match database membership (not seeded fixtures).
 */
export function useWorkspaceRouteContext(): WorkspaceRouteContextValue {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId?.trim() ?? "";
  useWorkspaceRealtime(isDatabaseWorkspaceId(workspaceId) ? workspaceId : undefined);
  const q = useQuery({
    queryKey: ["workspace", workspaceId, "shell"],
    queryFn: () => fetchWorkspaceSidebarContext(workspaceId),
    enabled: workspaceId.length > 0 && isDatabaseWorkspaceId(workspaceId),
    staleTime: 30_000,
  });

  const accessDenied = q.isError && isAccessDeniedError(q.error);

  return {
    workspaceId,
    sidebar: q.data?.sidebar,
    myRole: q.data?.myRole,
    isLoading: q.isLoading,
    isError: q.isError,
    accessDenied,
    error: q.error,
    refetch: () => {
      void q.refetch();
    },
  };
}
