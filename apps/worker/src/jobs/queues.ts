export const WORKER_QUEUES = {
  EXPORTS: "exports",
  TASK_REMINDERS: "task-reminders",
} as const;

export type WorkerQueueName = (typeof WORKER_QUEUES)[keyof typeof WORKER_QUEUES];
