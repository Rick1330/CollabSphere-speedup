import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type {
  ActivityRecordedPayload,
  CommentCreatedPayload,
  CommentDeletedPayload,
  CommentThreadResolvedPayload,
  CommentUpdatedPayload,
  DocumentApprovedPayload,
  DocumentCreatedPayload,
  DocumentLockedPayload,
  DocumentStatusChangedPayload,
  DocumentSubmittedPayload,
  DocumentUnlockedPayload,
  ExportCompletedPayload,
  SubmissionCreatedPayload,
  SubmissionUpdatedPayload,
  TaskAssignedPayload,
  TaskCompletedPayload,
  TaskCreatedPayload,
  TaskDeletedPayload,
  TaskStatusChangedPayload,
  WorkspaceArchivedPayload,
  WorkspaceMemberJoinedPayload,
  WorkspaceMemberRemovedPayload,
  WorkspaceMemberRoleChangedPayload,
  WorkspaceSettingsUpdatedPayload,
  WorkspaceUpdatedPayload,
} from "./realtime-domain-payloads.js";
import { RealtimeGateway } from "./realtime.gateway.js";

@Injectable()
export class RealtimeListener {
  private readonly logger = new Logger(RealtimeListener.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  private workspaceRoom(workspaceId: string): string {
    return `workspace:${workspaceId}`;
  }

  @OnEvent("workspace.updated", { async: false })
  onWorkspaceUpdated(payload: WorkspaceUpdatedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "workspace:updated", {
      workspaceId: payload.workspaceId,
      changes: payload.changes ?? {},
    });
  }

  @OnEvent("workspace.archived", { async: false })
  onWorkspaceArchived(payload: WorkspaceArchivedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "workspace:archived", {
      workspaceId: payload.workspaceId,
    });
  }

  @OnEvent("workspace.member_joined", { async: false })
  onWorkspaceMemberJoined(payload: WorkspaceMemberJoinedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "workspace:member_joined", {
      workspaceId: payload.workspaceId,
      userId: payload.userId,
      role: payload.role,
    });
  }

  @OnEvent("workspace.member_removed", { async: false })
  onWorkspaceMemberRemoved(payload: WorkspaceMemberRemovedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "workspace:member_removed", {
      workspaceId: payload.workspaceId,
      userId: payload.userId,
    });
  }

  @OnEvent("workspace.member_role_changed", { async: false })
  onWorkspaceMemberRoleChanged(payload: WorkspaceMemberRoleChangedPayload): void {
    this.logger.debug(
      `workspace.member_role_changed → workspace:role_changed (${payload.workspaceId}, ${payload.userId})`,
    );
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "workspace:role_changed", {
      workspaceId: payload.workspaceId,
      userId: payload.userId,
      newRole: payload.newRole,
      oldRole: payload.oldRole,
    });
  }

  @OnEvent("workspace.settings_updated", { async: false })
  onWorkspaceSettingsUpdated(payload: WorkspaceSettingsUpdatedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "workspace:settings_updated", {
      workspaceId: payload.workspaceId,
      settings: payload.settings ?? {},
    });
  }

  @OnEvent("document.created", { async: false })
  onDocumentCreated(payload: DocumentCreatedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "document:created", {
      workspaceId: payload.workspaceId,
      documentId: payload.documentId,
      folderId: payload.folderId ?? null,
      title: payload.title ?? "",
    });
  }

  @OnEvent("document.status_changed", { async: false })
  onDocumentStatusChanged(payload: DocumentStatusChangedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "document:status_changed", {
      workspaceId: payload.workspaceId,
      documentId: payload.documentId,
      toStatus: payload.toStatus,
      fromStatus: payload.fromStatus,
    });
  }

  @OnEvent("document.locked", { async: false })
  onDocumentLocked(payload: DocumentLockedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "document:locked", {
      workspaceId: payload.workspaceId,
      documentId: payload.documentId,
      lockedById: payload.lockedById,
    });
  }

  @OnEvent("document.unlocked", { async: false })
  onDocumentUnlocked(payload: DocumentUnlockedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "document:unlocked", {
      workspaceId: payload.workspaceId,
      documentId: payload.documentId,
    });
  }

  @OnEvent("document.submitted", { async: false })
  onDocumentSubmitted(payload: DocumentSubmittedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "document:submitted", {
      workspaceId: payload.workspaceId,
      documentId: payload.documentId,
      submittedById: payload.submittedById,
    });
  }

  @OnEvent("document.approved", { async: false })
  onDocumentApproved(payload: DocumentApprovedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "document:approved", {
      workspaceId: payload.workspaceId,
      documentId: payload.documentId,
      approvedById: payload.approvedById,
    });
  }

  @OnEvent("submission.created", { async: false })
  onSubmissionCreated(payload: SubmissionCreatedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "submission:created", {
      workspaceId: payload.workspaceId,
      documentId: payload.documentId,
      submissionId: payload.submissionId,
      submittedById: payload.submittedById,
      submittedAt: payload.submittedAt,
    });
  }

  @OnEvent("submission.updated", { async: false })
  onSubmissionUpdated(payload: SubmissionUpdatedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "submission:updated", {
      workspaceId: payload.workspaceId,
      documentId: payload.documentId,
      submissionId: payload.submissionId,
      decision: payload.decision,
      decidedById: payload.decidedById,
      decidedAt: payload.decidedAt,
    });
  }

  @OnEvent("task.created", { async: false })
  onTaskCreated(payload: TaskCreatedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "task:created", {
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
      status: payload.status,
    });
  }

  @OnEvent("task.status_changed", { async: false })
  onTaskStatusChanged(payload: TaskStatusChangedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "task:moved", {
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
      toStatus: payload.toStatus,
      position: payload.position,
    });
  }

  @OnEvent("task.assigned", { async: false })
  onTaskAssigned(payload: TaskAssignedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "task:assigned", {
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
      assigneeId: payload.assigneeId,
    });
  }

  @OnEvent("task.deleted", { async: false })
  onTaskDeleted(payload: TaskDeletedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "task:deleted", {
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
    });
  }

  @OnEvent("task.completed", { async: false })
  onTaskCompleted(payload: TaskCompletedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "task:completed", {
      workspaceId: payload.workspaceId,
      taskId: payload.taskId,
    });
  }

  @OnEvent("comment.created", { async: false })
  onCommentCreated(payload: CommentCreatedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "comment:created", {
      workspaceId: payload.workspaceId,
      threadId: payload.threadId,
      commentId: payload.commentId,
      targetType: payload.targetType,
      targetId: payload.targetId,
      authorId: payload.authorId,
    });
  }

  @OnEvent("comment.updated", { async: false })
  onCommentUpdated(payload: CommentUpdatedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "comment:updated", {
      workspaceId: payload.workspaceId,
      threadId: payload.threadId,
      commentId: payload.commentId,
    });
  }

  @OnEvent("comment.deleted", { async: false })
  onCommentDeleted(payload: CommentDeletedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "comment:deleted", {
      workspaceId: payload.workspaceId,
      threadId: payload.threadId,
      commentId: payload.commentId,
    });
  }

  @OnEvent("comment.thread_resolved", { async: false })
  onCommentThreadResolved(payload: CommentThreadResolvedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "comment:thread_resolved", {
      workspaceId: payload.workspaceId,
      threadId: payload.threadId,
      resolvedById: payload.resolvedById,
    });
  }

  @OnEvent("activity.recorded", { async: false })
  onActivityRecorded(payload: ActivityRecordedPayload): void {
    this.gateway.emitToRoom(this.workspaceRoom(payload.workspaceId), "activity:new", {
      workspaceId: payload.workspaceId,
      event: payload.activityEvent,
    });
  }

  @OnEvent("export.completed", { async: false })
  onExportCompleted(payload: ExportCompletedPayload): void {
    this.gateway.emitToUser(payload.userId, "export:completed", {
      exportJobId: payload.exportJobId,
      fileUrl: payload.fileUrl,
    });
  }
}
