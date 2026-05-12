import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchWorkspaceSidebarContext } from "@/api/adapters/workspaces";
import type { WorkspaceForSidebar } from "@/features/workspace/components/workspace-sidebar";
import type { WorkspaceRole } from "@/api/adapters/members";

export interface WorkspaceRouteContextValue {
  workspaceId: string;
  sidebar: WorkspaceForSidebar | undefined;
  myRole: WorkspaceRole | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Canonical workspace-route shell: resolves `/w/:workspaceId` against the API
 * so sidebar + permissions match database membership (not seeded fixtures).
 */
export function useWorkspaceRouteContext(): WorkspaceRouteContextValue {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId?.trim() ?? "";
  const q = useQuery({
    queryKey: ["workspace", workspaceId, "shell"],
    queryFn: () => fetchWorkspaceSidebarContext(workspaceId),
    enabled: workspaceId.length > 0,
    staleTime: 30_000,
  });

  return {
    workspaceId,
    sidebar: q.data?.sidebar,
    myRole: q.data?.myRole,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: () => {
      void q.refetch();
    },
  };
}
