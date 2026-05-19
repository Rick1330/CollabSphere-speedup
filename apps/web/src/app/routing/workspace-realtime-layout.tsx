import { Outlet, useParams } from "react-router-dom";
import { useWorkspaceRealtime } from "@/hooks/use-workspace-realtime";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";

/**
 * Joins the workspace Socket.IO room for every `/w/:workspaceId/*` child route
 * (including DocumentEditor, which does not use `useWorkspaceRouteContext`).
 */
export function WorkspaceRealtimeLayout() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId?.trim() ?? "";
  useWorkspaceRealtime(isDatabaseWorkspaceId(workspaceId) ? workspaceId : undefined);
  return <Outlet />;
}
