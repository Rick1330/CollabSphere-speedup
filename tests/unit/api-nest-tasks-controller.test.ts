import assert from "node:assert/strict";
import test from "node:test";
import "../integration/nest-api-http-env.setup.ts";
import { TasksNestController } from "../../apps/api/src/tasks/tasks.nest.controller.js";
import type { TasksService } from "../../apps/api/src/tasks/tasks.service.js";

const createController = () => {
  const tasksService: Pick<
    TasksService,
    "listTasks" | "getTaskById" | "createTask" | "updateTask" | "assignTask" | "updateTaskStatus" | "deleteTask"
  > = {
    listTasks: async ({ view }) =>
      view === "board"
        ? {
            view: "board" as const,
            columns: [{ id: "col-1", status: "todo", name: "To Do", position: 1 }],
            tasks: [{ id: "task-1", title: "Task A", status: "todo", position: 1 }],
          }
        : {
            view: "list" as const,
            tasks: [{ id: "task-1", title: "Task A", status: "todo", position: 1 }],
          },
    getTaskById: async () => ({ id: "task-1", title: "Task A", status: "todo" }),
    createTask: async () => ({ id: "task-2", title: "New task", status: "todo" }),
    updateTask: async () => ({ id: "task-1", title: "Task A+", status: "todo" }),
    assignTask: async () => ({ id: "task-1", title: "Task A+", status: "todo", assigneeId: "user-2" }),
    updateTaskStatus: async () => ({ id: "task-1", title: "Task A+", status: "in_progress" }),
    deleteTask: async () => ({ message: "Task deleted." }),
  };
  return new TasksNestController(tasksService as TasksService);
};

test("TasksNestController returns board/list envelopes", async () => {
  const controller = createController();
  const board = await controller.listTasks("ws-1", "user-1", "req-1", { view: "board" });
  assert.equal(board.data.resource.view, "board");
  assert.equal(Array.isArray((board.data.resource as { tasks: unknown[] }).tasks), true);

  const list = await controller.listTasks("ws-1", "user-1", "req-2", { view: "list" });
  assert.equal(list.data.resource.view, "list");
  assert.equal(Array.isArray((list.data.resource as { tasks: unknown[] }).tasks), true);
});

test("TasksNestController create and mutation endpoints wrap payloads", async () => {
  const controller = createController();

  const created = await controller.createTask("ws-1", "user-1", "req-3", { title: "My task" });
  assert.equal(created.statusCode, 201);
  assert.equal(created.data.resource.task.id, "task-2");

  const assigned = await controller.assignTask("ws-1", "task-1", "user-1", "req-4", {
    assigneeId: "user-2",
  });
  assert.equal(assigned.data.resource.task.assigneeId, "user-2");

  const moved = await controller.updateTaskStatus("ws-1", "task-1", "user-1", "req-5", {
    status: "in_progress",
  });
  assert.equal(moved.data.resource.task.status, "in_progress");

  const deleted = await controller.deleteTask("ws-1", "task-1", "user-1", "req-6");
  assert.equal(deleted.data.message, "Task deleted.");
});
