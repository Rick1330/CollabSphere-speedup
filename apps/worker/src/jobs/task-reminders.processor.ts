import { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";

export const processTaskReminderJob = async (
  _job: Job,
  deps: { prisma: PrismaClient },
) => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tasks = await deps.prisma.task.findMany({
    where: {
      deletedAt: null,
      dueDate: { lte: in24h },
      assigneeId: { not: null },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assigneeId: true,
      workspaceId: true,
    },
  });
  for (const task of tasks) {
    const type = task.dueDate && task.dueDate < now ? "deadline.overdue" : "deadline.reminder";
    await deps.prisma.notification.create({
      data: {
        recipientId: task.assigneeId!,
        workspaceId: task.workspaceId,
        actorId: null,
        type,
        title: type === "deadline.overdue" ? `Task overdue: ${task.title}` : `Task due soon: ${task.title}`,
        body: null,
        resourceType: "task",
        resourceId: task.id,
        url: `/w/${task.workspaceId}/tasks/${task.id}`,
        metadata: {
          taskId: task.id,
          dueDate: task.dueDate,
        },
      },
    });
  }
  return { created: tasks.length };
};
