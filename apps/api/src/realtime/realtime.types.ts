export type RealtimeEventPrefix =
  | "task"
  | "comment"
  | "notification"
  | "activity"
  | "document"
  | "workspace";

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

export type JoinDocumentRoomPayload = {
  workspaceId: string;
  documentId: string;
  fullName?: string;
};

export type LeaveDocumentRoomPayload = {
  documentId: string;
};

export type DocumentPresencePayload = {
  workspaceId: string;
  documentId: string;
  userId: string;
  fullName: string;
};
