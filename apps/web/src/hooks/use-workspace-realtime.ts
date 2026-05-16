import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { authSession } from "@/lib/auth-session";
import { resolveRealtimeSocketOrigin } from "@/api/client";
import { documentTreeQueryKey } from "@/features/documents/hooks/use-document-tree";

let sharedSocket: Socket | null = null;

function getRealtimeSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = authSession.getAccessToken();
  if (!token) return null;

  if (!sharedSocket) {
    sharedSocket = io(`${resolveRealtimeSocketOrigin()}/realtime`, {
      transports: ["websocket"],
      auth: { token },
      withCredentials: true,
    });
  }
  return sharedSocket;
}

/**
 * Subscribes to workspace Socket.IO events and invalidates React Query caches.
 */
export function useWorkspaceRealtime(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const socket = getRealtimeSocket();
    if (!socket) return;

    const join = () => {
      socket.emit("room:join:workspace", { workspaceId });
    };

    const onRoleChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "shell"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "members"] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces", "mine"] });
    };

    const onTreeChanged = () => {
      void queryClient.invalidateQueries({ queryKey: documentTreeQueryKey(workspaceId) });
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("workspace:member_role_changed", onRoleChanged);
    socket.on("workspace:folder_created", onTreeChanged);
    socket.on("workspace:folder_updated", onTreeChanged);
    socket.on("workspace:folder_deleted", onTreeChanged);
    socket.on("workspace:document_created", onTreeChanged);
    socket.on("workspace:document_updated", onTreeChanged);
    socket.on("workspace:document_deleted", onTreeChanged);

    return () => {
      socket.off("connect", join);
      socket.off("workspace:member_role_changed", onRoleChanged);
      socket.off("workspace:folder_created", onTreeChanged);
      socket.off("workspace:folder_updated", onTreeChanged);
      socket.off("workspace:folder_deleted", onTreeChanged);
      socket.off("workspace:document_created", onTreeChanged);
      socket.off("workspace:document_updated", onTreeChanged);
      socket.off("workspace:document_deleted", onTreeChanged);
      socket.emit("room:leave:workspace", { workspaceId });
    };
  }, [workspaceId, queryClient]);
}
