import { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";

export const processTaskReminderJob = async (
  _job: Job,
  deps: { prisma: PrismaClient },
) => {
  if (!deps?.prisma || typeof deps.prisma !== "object" || !("task" in deps.prisma)) {
    // Defensive: avoid crashing the worker on malformed DI/job wiring.
    return { created: 0, skipped: "missing_prisma" };
  }

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
  let createdCount = 0;
  for (const task of tasks) {
    const type = task.dueDate && task.dueDate < now ? "deadline.overdue" : "deadline.reminder";
    const dedupeSince = new Date(now.getTime() - 20 * 60 * 60 * 1000);
    const existing = await deps.prisma.notification.findFirst({
      where: {
        recipientId: task.assigneeId!,
        workspaceId: task.workspaceId,
        type,
        resourceType: "task",
        resourceId: task.id,
        createdAt: { gte: dedupeSince },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      continue;
    }
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
    createdCount += 1;
  }
  return { created: createdCount };
};
