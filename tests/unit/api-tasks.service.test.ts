import assert from "node:assert/strict";
import test from "node:test";
import { ResourceType } from "@prisma/client";
import { TasksService } from "../../apps/api/src/tasks/tasks.service.js";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "33333333-3333-4333-8333-333333333333";

function createTasksService(overrides?: {
  activityCreate?: () => Promise<unknown>;
  onEmit?: (event: string, payload: unknown) => void;
}) {
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const eventEmitter = {
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
      overrides?.onEmit?.(event, payload);
    },
  };

  const prisma = {
    workspaceMember: {
      findFirst: async () => ({ id: "m-1", workspace: { status: "active" } }),
    },
    workspaceMember_findMany: async () => [],
    task: {
      findFirst: async () => null,
      create: async () => ({
        id: "task-1",
        workspaceId: WORKSPACE_ID,
        title: "Test task",
        status: "todo",
        priority: "medium",
        assigneeId: null,
        position: { toNumber: () => 1 },
        assignee: null,
        reporter: { id: ACTOR_ID, fullName: "Test User" },
      }),
    },
    user: {
      findUnique: async () => ({
        fullName: "Test User",
        avatarUrl: null,
        email: "test@example.com",
        globalRole: "USER",
      }),
    },
    activityEvent: {
      create: overrides?.activityCreate ?? (async () => ({ id: "activity-1" })),
    },
    auditLog: {
      create: async () => ({ id: "audit-1" }),
    },
  };

  // assertAssignee uses workspaceMember.findMany
  (prisma as { workspaceMember: { findMany: () => Promise<unknown[]> } }).workspaceMember.findMany =
    async () => [];

  const service = new TasksService(prisma as never, eventEmitter as never);
  return { service, emitted, prisma };
}

test("createTask returns task when activity persistence fails", async () => {
  const { service, emitted } = createTasksService({
    activityCreate: async () => {
      throw new Error("activity table missing");
    },
  });

  const task = await service.createTask({
    actorUserId: ACTOR_ID,
    workspaceId: WORKSPACE_ID,
    title: "Ship fix",
  });

  assert.equal(task.id, "task-1");
  const created = emitted.find((entry) => entry.event === "task.created");
  assert.ok(created, "expected task.created domain event");
});

test("emitTaskMutation uses ResourceType.task for activity events", async () => {
  let capturedResourceType: ResourceType | undefined;
  const { service } = createTasksService({
    activityCreate: async (args: { data: { resourceType: ResourceType } }) => {
      capturedResourceType = args.data.resourceType;
      return { id: "activity-1" };
    },
  });

  await service.createTask({
    actorUserId: ACTOR_ID,
    workspaceId: WORKSPACE_ID,
    title: "Ship fix",
  });

  assert.equal(capturedResourceType, ResourceType.task);
});
