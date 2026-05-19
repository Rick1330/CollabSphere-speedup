import type { TaskDetail, TaskStatus } from "@/features/tasks/mocks/tasks";

export function applyTaskMoved(
  tasks: Record<string, TaskDetail>,
  payload: { taskId: string; toStatus: string; position?: number },
): Record<string, TaskDetail> {
  const task = tasks[payload.taskId];
  if (!task) return tasks;
  return {
    ...tasks,
    [payload.taskId]: {
      ...task,
      status: payload.toStatus as TaskStatus,
      position: payload.position ?? task.position,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function applyTaskDeleted(
  tasks: Record<string, TaskDetail>,
  payload: { taskId: string },
): Record<string, TaskDetail> {
  if (!tasks[payload.taskId]) return tasks;
  const next = { ...tasks };
  delete next[payload.taskId];
  return next;
}

export function applyTaskCompleted(
  tasks: Record<string, TaskDetail>,
  payload: { taskId: string },
): Record<string, TaskDetail> {
  const task = tasks[payload.taskId];
  if (!task) return tasks;
  return {
    ...tasks,
    [payload.taskId]: {
      ...task,
      status: "done",
      updatedAt: new Date().toISOString(),
    },
  };
}
