import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityEvent } from "@prisma/client";
import { RealtimeEventsService } from "../../apps/api/src/realtime/realtime-events.service.js";

const createGatewayMock = () => {
  const emittedWorkspace: Array<{ workspaceId: string; event: string; payload: unknown }> = [];
  const emittedUser: Array<{ userId: string; event: string; payload: unknown }> = [];
  const emittedTask: Array<{ taskId: string; event: string; payload: unknown }> = [];

  return {
    gateway: {
      emitToWorkspace: (workspaceId: string, event: string, payload: unknown) => {
        emittedWorkspace.push({ workspaceId, event, payload });
      },
      emitToUser: (userId: string, event: string, payload: unknown) => {
        emittedUser.push({ userId, event, payload });
      },
      emitToTask: (taskId: string, event: string, payload: unknown) => {
        emittedTask.push({ taskId, event, payload });
      },
    },
    emittedWorkspace,
    emittedUser,
    emittedTask,
  };
};

test("realtime events fan out to workspace, user, and task rooms", () => {
  const mock = createGatewayMock();
  const service = new RealtimeEventsService(mock.gateway as never);
  service.emitTask("task:updated", {
    workspaceId: "ws-1",
    userId: "user-1",
    taskId: "task-5",
    data: { id: "task-5", title: "Review draft" },
  });

  assert.equal(mock.emittedWorkspace.length, 1);
  assert.equal(mock.emittedUser.length, 1);
  assert.equal(mock.emittedTask.length, 1);
  assert.equal(mock.emittedWorkspace[0]?.event, "task:updated");
});

test("realtime events map activity records to activity:created payload", () => {
  const mock = createGatewayMock();
  const service = new RealtimeEventsService(mock.gateway as never);
  const createdAt = new Date("2026-05-08T00:00:00.000Z");
  const record: ActivityEvent = {
    id: "act-1",
    workspaceId: "ws-1",
    actorId: "user-1",
    actorNameSnapshot: "Alice",
    actorAvatarSnapshot: null,
    eventKey: "document.submitted",
    summary: "Alice submitted a document",
    resourceType: "document",
    resourceId: "doc-1",
    resourceTitleSnapshot: "Doc A",
    metadata: { source: "unit-test" },
    createdAt,
  };

  service.emitActivityFromRecord(record);

  assert.equal(mock.emittedWorkspace.length, 1);
  assert.equal(mock.emittedWorkspace[0]?.event, "activity:created");
  assert.deepEqual(mock.emittedWorkspace[0]?.payload, {
    id: "act-1",
    workspaceId: "ws-1",
    actorId: "user-1",
    actorNameSnapshot: "Alice",
    actorAvatarSnapshot: null,
    eventKey: "document.submitted",
    summary: "Alice submitted a document",
    resourceType: "document",
    resourceId: "doc-1",
    resourceTitleSnapshot: "Doc A",
    metadata: { source: "unit-test" },
    createdAt,
  });
});
