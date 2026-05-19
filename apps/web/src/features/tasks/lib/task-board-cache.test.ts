import { describe, expect, it } from "vitest";
import type { TaskDetail } from "@/features/tasks/mocks/tasks";
import {
  applyTaskCompleted,
  applyTaskDeleted,
  applyTaskMoved,
} from "./task-board-cache";

const baseTask = (overrides: Partial<TaskDetail> = {}): TaskDetail =>
  ({
    id: "t1",
    title: "Task",
    status: "todo",
    priority: "medium",
    assignee: null,
    dueDate: null,
    labels: [],
    commentCount: 0,
    position: 1,
    description: null,
    reporterId: "u1",
    reporterName: "User",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    linkedResources: [],
    comments: [],
    ...overrides,
  }) as TaskDetail;

describe("task-board-cache", () => {
  it("applyTaskMoved updates status and position", () => {
    const tasks = { t1: baseTask() };
    const next = applyTaskMoved(tasks, { taskId: "t1", toStatus: "in_progress", position: 3 });
    expect(next.t1.status).toBe("in_progress");
    expect(next.t1.position).toBe(3);
  });

  it("applyTaskMoved is a no-op for unknown task", () => {
    const tasks = { t1: baseTask() };
    const next = applyTaskMoved(tasks, { taskId: "missing", toStatus: "done" });
    expect(next).toBe(tasks);
  });

  it("applyTaskDeleted removes the task", () => {
    const tasks = { t1: baseTask(), t2: baseTask({ id: "t2" }) };
    const next = applyTaskDeleted(tasks, { taskId: "t1" });
    expect(next.t1).toBeUndefined();
    expect(next.t2).toBeDefined();
  });

  it("applyTaskCompleted sets status to done", () => {
    const tasks = { t1: baseTask({ status: "in_review" }) };
    const next = applyTaskCompleted(tasks, { taskId: "t1" });
    expect(next.t1.status).toBe("done");
  });
});
