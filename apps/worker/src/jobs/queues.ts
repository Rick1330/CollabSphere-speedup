export const WORKER_QUEUES = {
  EXPORTS: "exports",
  TASK_REMINDERS: "task-reminders",
  EXPORTS_DLQ: "exports-dlq",
  TASK_REMINDERS_DLQ: "task-reminders-dlq",
} as const;

export type WorkerQueueName = (typeof WORKER_QUEUES)[keyof typeof WORKER_QUEUES];
