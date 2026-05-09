import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import { TasksService } from "../../apps/api/src/tasks/tasks.service.js";

const createService = (overrides: Record<string, unknown> = {}) => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({ role: "MANAGER", id: "m-1" }),
    },
    task: {
      findFirst: async () => ({ id: "task-1", status: "todo", position: 2 }),
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "task-1",
        workspaceId: data.workspaceId,
        title: data.title,
        status: data.status,
        assigneeId: data.assigneeId ?? null,
        reporterId: data.reporterId,
      }),
      update: async () => ({
        id: "task-1",
        workspaceId: "ws-1",
        title: "Task",
        status: "in_progress",
        assigneeId: "user-2",
        reporterId: "user-1",
      }),
    },
    taskColumn: {
      findMany: async () => [],
    },
    user: {
      findUnique: async () => ({
        fullName: "Actor User",
        avatarUrl: null,
        email: "actor@example.com",
        globalRole: "USER",
      }),
    },
    activityEvent: {
      create: async () => ({
        id: "act-1",
        workspaceId: "ws-1",
        actorId: "user-1",
        actorNameSnapshot: "Actor User",
        actorAvatarSnapshot: null,
        eventKey: "task.created",
        summary: "Task created",
        resourceType: "task",
        resourceId: "task-1",
        resourceTitleSnapshot: "Task",
        metadata: {},
        createdAt: new Date(),
      }),
    },
    auditLog: {
      create: async () => ({ id: "audit-1" }),
    },
    ...overrides,
  };

  const realtimeEvents = {
    emitTask: () => undefined,
    emitActivityFromRecord: () => undefined,
  };

  return new TasksService(prisma as never, realtimeEvents as never);
};

test("tasks service creates task with defaults", async () => {
  const service = createService();
  const task = await service.createTask({
    actorUserId: "user-1",
    workspaceId: "ws-1",
    title: "Prepare sprint notes",
  });
  assert.equal(task.status, "todo");
  assert.equal(task.title, "Prepare sprint notes");
});

test("tasks service blocks invalid status transitions", async () => {
  const service = createService({
    task: {
      findFirst: async ({ where }: { where?: { id?: string } }) =>
        where?.id
          ? {
              id: "task-1",
              workspaceId: "ws-1",
              title: "Task",
              status: "todo",
              assigneeId: null,
            }
          : null,
      update: async () => ({}),
    },
  });

  await assert.rejects(
    () =>
      service.updateTaskStatus({
        actorUserId: "user-1",
        workspaceId: "ws-1",
        taskId: "task-1",
        status: "done",
      }),
    (error: unknown) => {
      assert.equal(error instanceof AppError, true);
      assert.equal((error as AppError).code, "INVALID_TRANSITION");
      return true;
    },
  );
});
