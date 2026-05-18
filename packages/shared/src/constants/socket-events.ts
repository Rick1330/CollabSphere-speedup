/**
 * Socket.IO event catalog — wire strings aligned with API gateway and web socket-client.
 */
export const ServerEvents = {
  CONNECTED: "server:connected",
  JOIN_DENIED: "client:join_denied",

  WORKSPACE_UPDATED: "workspace:updated",
  WORKSPACE_ARCHIVED: "workspace:archived",
  WORKSPACE_MEMBER_JOINED: "workspace:member_joined",
  WORKSPACE_MEMBER_REMOVED: "workspace:member_removed",
  WORKSPACE_ROLE_CHANGED: "workspace:role_changed",
  WORKSPACE_SETTINGS_UPDATED: "workspace:settings_updated",

  DOCUMENT_CREATED: "document:created",
  DOCUMENT_STATUS_CHANGED: "document:status_changed",
  DOCUMENT_LOCKED: "document:locked",
  DOCUMENT_UNLOCKED: "document:unlocked",
  DOCUMENT_SUBMITTED: "document:submitted",
  DOCUMENT_APPROVED: "document:approved",
  DOCUMENT_CHANGES_REQUESTED: "document:changes_requested",
  DOCUMENT_AWARENESS: "document:awareness",

  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_MOVED: "task:moved",
  TASK_ASSIGNED: "task:assigned",
  TASK_DELETED: "task:deleted",
  TASK_COMPLETED: "task:completed",
  TASK_STATUS_CHANGED: "task:status_changed",

  COMMENT_THREAD_CREATED: "comment:thread_created",
  COMMENT_CREATED: "comment:created",
  COMMENT_REPLY_CREATED: "comment:reply_created",
  COMMENT_UPDATED: "comment:updated",
  COMMENT_DELETED: "comment:deleted",
  COMMENT_THREAD_RESOLVED: "comment:thread_resolved",
  COMMENT_RESOLVED: "comment:resolved",
  COMMENT_UNRESOLVED: "comment:unresolved",

  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_CREATED: "notification:created",
  NOTIFICATION_COUNT: "notification:count",

  ACTIVITY_NEW: "activity:new",
  ACTIVITY_CREATED: "activity:created",

  EXPORT_COMPLETED: "export:completed",
  EXPORT_FAILED: "export:failed",
} as const;

export const ClientEvents = {
  JOIN_ROOM: "room:join:workspace",
  LEAVE_ROOM: "room:leave:workspace",
  MARK_NOTIFICATION_READ: "notification:read",
} as const;

export type ServerEventName = (typeof ServerEvents)[keyof typeof ServerEvents];
export type ClientEventName = (typeof ClientEvents)[keyof typeof ClientEvents];
