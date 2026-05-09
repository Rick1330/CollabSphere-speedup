export type RealtimeEventPrefix = "task" | "comment" | "notification" | "activity" | "document";

export type RealtimeEventName = `${RealtimeEventPrefix}:${string}`;

export type RealtimeAuthUser = {
  userId: string;
  email: string;
  globalRole: string;
};

export type JoinWorkspaceRoomPayload = {
  workspaceId: string;
};

export type LeaveWorkspaceRoomPayload = {
  workspaceId: string;
};

export type JoinTaskRoomPayload = {
  workspaceId: string;
  taskId: string;
};

export type LeaveTaskRoomPayload = {
  taskId: string;
};
