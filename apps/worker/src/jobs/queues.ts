export const WORKER_QUEUES = {
  EXPORTS: "exports",
  DOCX_IMPORTS: "docx-imports",
  TASK_REMINDERS: "task-reminders",
  EXPORTS_DLQ: "exports-dlq",
  DOCX_IMPORTS_DLQ: "docx-imports-dlq",
  TASK_REMINDERS_DLQ: "task-reminders-dlq",
} as const;

export type WorkerQueueName = (typeof WORKER_QUEUES)[keyof typeof WORKER_QUEUES];
