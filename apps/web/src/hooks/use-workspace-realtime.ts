import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ensureRealtimeConnected,
  joinWorkspaceRoom,
  onRealtimeReconnect,
  subscribeActivityEvents,
  subscribeNotificationEvents,
  subscribeWorkspaceEvents,
} from "@/api/realtime/socket-client";
import { authSession, useCurrentAccount } from "@/lib/auth-session";
import type { WorkspaceRoleKey } from "@/lib/persona-scenario";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";

type ActivityCreatedPayload = {
  workspaceId?: string;
  id?: string;
};

type MemberRoleChangedPayload = {
  workspaceId?: string;
  userId?: string;
  newRole?: WorkspaceRoleKey;
  oldRole?: WorkspaceRoleKey;
};

/**
 * Joins the workspace Socket.IO room and invalidates notification/activity queries
 * when matching realtime events arrive.
 */
export function useWorkspaceRealtime(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const account = useCurrentAccount();

  useEffect(() => {
    if (!workspaceId || !isDatabaseWorkspaceId(workspaceId) || !account?.id) {
      return;
    }

    let cancelled = false;

    const joinRoom = () => {
      if (cancelled) return;
      void joinWorkspaceRoom(workspaceId).catch(() => {
        /* connection status handled by page-level subscribeRealtimeStatus */
      });
    };

    void ensureRealtimeConnected().then(() => {
      if (!cancelled) joinRoom();
    });

    const offReconnect = onRealtimeReconnect(() => {
      joinRoom();
    });

    const offNotifications = subscribeNotificationEvents((_event, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    const offActivity = subscribeActivityEvents((_event, payload) => {
      const data = payload as ActivityCreatedPayload;
      if (data?.workspaceId && data.workspaceId !== workspaceId) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "activity"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "activity"] });
    });

    const offWorkspace = subscribeWorkspaceEvents((event, payload) => {
      if (event !== "workspace:role_changed") return;
      const data = payload as MemberRoleChangedPayload;
      if (data?.workspaceId && data.workspaceId !== workspaceId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "shell"] });
      void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "members"] });
      void queryClient.invalidateQueries({ queryKey: ["workspaces", "mine"] });

      if (data.userId === account.id && data.newRole) {
        authSession.patchSession({
          user: { defaultWorkspaceRole: data.newRole },
        });
      }
    });

    return () => {
      cancelled = true;
      offReconnect();
      offNotifications();
      offActivity();
      offWorkspace();
    };
  }, [workspaceId, account?.id, queryClient]);
}
