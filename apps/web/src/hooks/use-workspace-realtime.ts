import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";
import {
  ensureRealtimeConnected,
  joinWorkspaceRoom,
  leaveWorkspaceRoom,
  onRealtimeReconnect,
  type WorkspaceRoomRealtimeEvent,
} from "@/api/realtime/socket-client";
import { fetchWorkspaceSidebarContext } from "@/api/adapters/workspaces";
import { authSession, useCurrentAccount } from "@/lib/auth-session";
import { queryKeys } from "@/lib/query-keys";
import {
  workspacePayload,
  type ActivityNewPayload,
  type CommentCreatedPayload,
  type CommentThreadResolvedPayload,
  type CommentUpdatedPayload,
  type DocumentApprovedPayload,
  type DocumentCreatedPayload,
  type DocumentLockedPayload,
  type DocumentStatusChangedPayload,
  type DocumentSubmittedPayload,
  type DocumentUnlockedPayload,
  type SubmissionCreatedPayload,
  type SubmissionUpdatedPayload,
  type TaskAssignedPayload,
  type TaskCompletedPayload,
  type TaskDeletedPayload,
  type TaskMovedPayload,
  type WorkspaceArchivedPayload,
  type WorkspaceMemberJoinedPayload,
  type WorkspaceMemberRemovedPayload,
  type WorkspaceRoleChangedPayload,
  type WorkspaceSettingsUpdatedPayload,
} from "@/lib/realtime-payloads";
import { getWorkspaceRoleLabel } from "@/lib/role-labels";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";
import {
  applyTaskCompleted,
  applyTaskDeleted,
  applyTaskMoved,
} from "@/features/tasks/lib/task-board-cache";

const WORKSPACE_ROOM_EVENTS = [
  "workspace:role_changed",
  "workspace:member_joined",
  "workspace:member_removed",
  "workspace:settings_updated",
  "workspace:archived",
  "document:created",
  "document:status_changed",
  "document:locked",
  "document:unlocked",
  "document:submitted",
  "document:approved",
  "submission:created",
  "submission:updated",
  "task:created",
  "task:moved",
  "task:assigned",
  "task:deleted",
  "task:completed",
  "comment:created",
  "comment:updated",
  "comment:thread_resolved",
  "activity:new",
] as const satisfies readonly WorkspaceRoomRealtimeEvent[];

type DocumentDetailCache = {
  isLocked?: boolean;
  status?: string;
};

/**
 * Joins the workspace Socket.IO room and keeps React Query caches in sync
 * with workspace-scoped realtime events.
 */
export function useWorkspaceRealtime(workspaceId: string | undefined): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const currentUserId = account?.id;
  const joinedRef = useRef(false);

  const handlerRef = useRef<(event: WorkspaceRoomRealtimeEvent, payload: unknown) => void>(
    () => undefined,
  );

  handlerRef.current = (event, payload) => {
    if (!workspaceId) return;

    const invalidateWorkspaceHome = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceHome.all(workspaceId) });
    };

    switch (event) {
      case "workspace:role_changed": {
        const data = workspacePayload<WorkspaceRoleChangedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(workspaceId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.mine() });
        if (data.userId === currentUserId && data.newRole) {
          authSession.patchSession({
            user: { defaultWorkspaceRole: data.newRole },
          });
          void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) });
          const shell = queryClient.getQueryData<Awaited<ReturnType<typeof fetchWorkspaceSidebarContext>>>(
            queryKeys.workspaces.detail(workspaceId),
          );
          const label = shell?.sidebar?.type
            ? getWorkspaceRoleLabel(shell.sidebar.type, data.newRole)
            : data.newRole;
          toast.success("Your workspace role was updated", { description: label });
        }
        break;
      }
      case "workspace:member_removed": {
        const data = workspacePayload<WorkspaceMemberRemovedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(workspaceId) });
        if (data.userId === currentUserId) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.mine() });
          toast.info("You were removed from this workspace");
          navigate("/workspaces", { replace: true });
        }
        break;
      }
      case "workspace:member_joined": {
        const data = workspacePayload<WorkspaceMemberJoinedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(workspaceId) });
        if (data.userId === currentUserId) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.mine() });
        }
        break;
      }
      case "workspace:settings_updated": {
        const data = workspacePayload<WorkspaceSettingsUpdatedPayload>(workspaceId, payload);
        if (!data) return;
        queryClient.setQueryData(
          queryKeys.workspaces.detail(workspaceId),
          (old: Awaited<ReturnType<typeof fetchWorkspaceSidebarContext>> | undefined) => {
            if (!old?.sidebar) return old;
            const settings = data.settings ?? {};
            const nextSidebar = { ...old.sidebar };
            if (typeof settings.name === "string") nextSidebar.name = settings.name;
            if (typeof settings.description === "string") {
              nextSidebar.description = settings.description;
            }
            if (typeof settings.icon === "string") nextSidebar.icon = settings.icon;
            if (settings.status === "active" || settings.status === "archived") {
              nextSidebar.status = settings.status;
            }
            return { ...old, sidebar: nextSidebar };
          },
        );
        break;
      }
      case "workspace:archived": {
        const data = workspacePayload<WorkspaceArchivedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) });
        break;
      }
      case "document:created": {
        const data = workspacePayload<DocumentCreatedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.documents.tree(workspaceId) });
        invalidateWorkspaceHome();
        break;
      }
      case "document:status_changed": {
        const data = workspacePayload<DocumentStatusChangedPayload>(workspaceId, payload);
        if (!data) return;
        queryClient.setQueryData<DocumentDetailCache>(
          queryKeys.documents.detail(workspaceId, data.documentId),
          (old) => (old ? { ...old, status: data.toStatus } : old),
        );
        void queryClient.invalidateQueries({ queryKey: queryKeys.documents.tree(workspaceId) });
        invalidateWorkspaceHome();
        break;
      }
      case "document:submitted": {
        const data = workspacePayload<DocumentSubmittedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.review.queue() });
        void queryClient.invalidateQueries({ queryKey: ["review-counts"] });
        void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "submission-center"] });
        void queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceId, "document-submissions", data.documentId],
        });
        break;
      }
      case "document:approved": {
        const data = workspacePayload<DocumentApprovedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.review.queue() });
        void queryClient.invalidateQueries({ queryKey: ["review-counts"] });
        void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "submission-center"] });
        void queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceId, "document-submissions", data.documentId],
        });
        queryClient.setQueryData<DocumentDetailCache>(
          queryKeys.documents.detail(workspaceId, data.documentId),
          (old) => (old ? { ...old, status: "approved" } : old),
        );
        toast.success("Document approved");
        break;
      }
      case "submission:created": {
        const data = workspacePayload<SubmissionCreatedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.review.queue() });
        void queryClient.invalidateQueries({ queryKey: ["review-counts"] });
        void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "submission-center"] });
        void queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceId, "document-submissions", data.documentId],
        });
        break;
      }
      case "submission:updated": {
        const data = workspacePayload<SubmissionUpdatedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.review.queue() });
        void queryClient.invalidateQueries({ queryKey: ["review-counts"] });
        void queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "submission-center"] });
        void queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceId, "document-submissions", data.documentId],
        });
        break;
      }
      case "document:locked": {
        const data = workspacePayload<DocumentLockedPayload>(workspaceId, payload);
        if (!data) return;
        queryClient.setQueryData<DocumentDetailCache>(
          queryKeys.documents.detail(workspaceId, data.documentId),
          (old) => (old ? { ...old, isLocked: true } : old),
        );
        break;
      }
      case "document:unlocked": {
        const data = workspacePayload<DocumentUnlockedPayload>(workspaceId, payload);
        if (!data) return;
        queryClient.setQueryData<DocumentDetailCache>(
          queryKeys.documents.detail(workspaceId, data.documentId),
          (old) => (old ? { ...old, isLocked: false } : old),
        );
        break;
      }
      case "task:created": {
        const data = workspacePayload<{ workspaceId: string }>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.board(workspaceId) });
        invalidateWorkspaceHome();
        break;
      }
      case "task:moved": {
        const data = workspacePayload<TaskMovedPayload>(workspaceId, payload);
        if (!data) return;
        queryClient.setQueryData(
          queryKeys.tasks.board(workspaceId),
          (prev) =>
            prev
              ? applyTaskMoved(
                  prev as Parameters<typeof applyTaskMoved>[0],
                  data,
                )
              : prev,
        );
        invalidateWorkspaceHome();
        break;
      }
      case "task:deleted": {
        const data = workspacePayload<TaskDeletedPayload>(workspaceId, payload);
        if (!data) return;
        queryClient.setQueryData(
          queryKeys.tasks.board(workspaceId),
          (prev) =>
            prev
              ? applyTaskDeleted(
                  prev as Parameters<typeof applyTaskDeleted>[0],
                  data,
                )
              : prev,
        );
        invalidateWorkspaceHome();
        break;
      }
      case "task:assigned": {
        const data = workspacePayload<TaskAssignedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(workspaceId, data.taskId),
        });
        break;
      }
      case "task:completed": {
        const data = workspacePayload<TaskCompletedPayload>(workspaceId, payload);
        if (!data) return;
        queryClient.setQueryData(
          queryKeys.tasks.board(workspaceId),
          (prev) =>
            prev
              ? applyTaskCompleted(
                  prev as Parameters<typeof applyTaskCompleted>[0],
                  data,
                )
              : prev,
        );
        invalidateWorkspaceHome();
        break;
      }
      case "comment:created": {
        const data = workspacePayload<CommentCreatedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.comments.threads(workspaceId, data.targetType, data.targetId),
        });
        break;
      }
      case "comment:updated": {
        const data = workspacePayload<CommentUpdatedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.comments.thread(workspaceId, data.threadId),
        });
        break;
      }
      case "comment:thread_resolved": {
        const data = workspacePayload<CommentThreadResolvedPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.comments.thread(workspaceId, data.threadId),
        });
        void queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceId, "comments"],
        });
        break;
      }
      case "activity:new": {
        const data = workspacePayload<ActivityNewPayload>(workspaceId, payload);
        if (!data) return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.activity.workspace(workspaceId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.activity.dashboard() });
        void queryClient.invalidateQueries({
          queryKey: ["workspace", workspaceId, "activity", "document"],
        });
        invalidateWorkspaceHome();
        break;
      }
      default:
        break;
    }
  };

  useEffect(() => {
    if (!workspaceId || !isDatabaseWorkspaceId(workspaceId) || !currentUserId) {
      return;
    }

    let cancelled = false;
    let socket: Socket | undefined;
    const cleanups: Array<() => void> = [];

    const registerHandlers = (instance: Socket) => {
      for (const event of WORKSPACE_ROOM_EVENTS) {
        const wrapper = (incoming: unknown) => {
          handlerRef.current(event, incoming);
        };
        instance.on(event, wrapper);
        cleanups.push(() => instance.off(event, wrapper));
      }
    };

    void ensureRealtimeConnected()
      .then((connectedSocket) => {
        if (cancelled) return;
        socket = connectedSocket;
        if (!joinedRef.current) {
          joinedRef.current = true;
          void joinWorkspaceRoom(workspaceId).catch(() => undefined);
        }
        registerHandlers(connectedSocket);
      })
      .catch(() => undefined);

    const offReconnect = onRealtimeReconnect(() => {
      joinedRef.current = false;
      void joinWorkspaceRoom(workspaceId)
        .then(() => {
          joinedRef.current = true;
        })
        .catch(() => undefined);
    });

    return () => {
      cancelled = true;
      offReconnect();
      cleanups.forEach((fn) => fn());
      joinedRef.current = false;
      void leaveWorkspaceRoom(workspaceId);
    };
  }, [workspaceId, currentUserId]);
}
