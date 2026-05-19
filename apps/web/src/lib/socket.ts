/**
 * Spec-aligned re-exports for the Socket.IO singleton.
 * Implementation lives in `@/api/realtime/socket-client`.
 */
export {
  bindAuthTokenSync,
  connectRealtime,
  disconnectRealtime,
  disconnectSocket,
  ensureRealtimeConnected,
  getJoinedRoomsForTests,
  getRealtimeNamespaceUrlForTests,
  getRealtimeSocket,
  getSocket,
  initSocket,
  joinWorkspaceRoom,
  leaveWorkspaceRoom,
  onRealtimeReconnect,
  replayJoinedRooms,
  resolveRealtimeNamespaceUrl,
  resolveSocketOrigin,
  subscribeActivityEvents,
  subscribeCommentEvents,
  subscribeNotificationEvents,
  subscribeRealtimeStatus,
  subscribeTaskEvents,
  subscribeWorkspaceEvents,
  syncSocketAuthFromSession,
} from "@/api/realtime/socket-client";

export type {
  ActivityRealtimeEvent,
  CommentRealtimeEvent,
  NotificationRealtimeEvent,
  RealtimeConnectionStatus,
  TaskRealtimeEvent,
  WorkspaceRealtimeEvent,
} from "@/api/realtime/socket-client";
