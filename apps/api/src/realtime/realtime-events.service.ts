import { Injectable } from "@nestjs/common";
import type { ActivityEvent } from "@prisma/client";
import { RealtimeGateway } from "./realtime.gateway.js";
import type { RealtimeEventName } from "./realtime.types.js";

type FanoutPayload = {
  workspaceId: string;
  userId?: string | null;
  taskId?: string | null;
  data: Record<string, unknown>;
};

@Injectable()
export class RealtimeEventsService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emit(event: RealtimeEventName, payload: FanoutPayload): void {
    this.gateway.emitToWorkspace(payload.workspaceId, event, payload.data);
    if (payload.userId) {
      this.gateway.emitToUser(payload.userId, event, payload.data);
    }
    if (payload.taskId) {
      this.gateway.emitToTask(payload.taskId, event, payload.data);
    }
  }

  emitTask(event: `task:${string}`, payload: FanoutPayload): void {
    this.emit(event, payload);
  }

  emitComment(event: `comment:${string}`, payload: FanoutPayload): void {
    this.emit(event, payload);
  }

  emitNotification(event: `notification:${string}`, payload: FanoutPayload): void {
    this.emit(event, payload);
  }

  emitActivity(event: `activity:${string}`, payload: FanoutPayload): void {
    this.emit(event, payload);
  }

  emitActivityFromRecord(record: ActivityEvent): void {
    this.emitActivity("activity:created", {
      workspaceId: record.workspaceId,
      userId: null,
      taskId: null,
      data: {
        id: record.id,
        workspaceId: record.workspaceId,
        actorId: record.actorId,
        actorNameSnapshot: record.actorNameSnapshot,
        actorAvatarSnapshot: record.actorAvatarSnapshot,
        eventKey: record.eventKey,
        summary: record.summary,
        resourceType: record.resourceType,
        resourceId: record.resourceId,
        resourceTitleSnapshot: record.resourceTitleSnapshot,
        metadata: record.metadata,
        createdAt: record.createdAt,
      },
    });
  }
}
