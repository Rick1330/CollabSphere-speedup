import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, ResourceType, type TaskPriority, type TaskStatus } from "@prisma/client";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  backlog: ["todo"],
  todo: ["backlog", "in_progress"],
  in_progress: ["todo", "in_review"],
  in_review: ["in_progress", "done"],
  done: ["in_review"],
};

const TASK_PRIORITIES: readonly TaskPriority[] = ["low", "medium", "high", "urgent"];
const TASK_STATUSES: readonly TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"];

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listTasks(input: { actorUserId: string; workspaceId: string; view: "list" | "board" }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const [columns, tasks] = await Promise.all([
      this.prisma.taskColumn.findMany({
        where: { workspaceId: input.workspaceId, deletedAt: null },
        orderBy: [{ position: "asc" }],
      }),
      this.prisma.task.findMany({
        where: { workspaceId: input.workspaceId, deletedAt: null },
        include: {
          assignee: { select: { id: true, fullName: true, avatarUrl: true } },
          reporter: { select: { id: true, fullName: true, avatarUrl: true } },
        },
        orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
      }),
    ]);
    if (input.view === "board") {
      return { view: "board" as const, columns, tasks };
    }
    return { view: "list" as const, tasks };
  }

  async getTaskById(input: { actorUserId: string; workspaceId: string; taskId: string }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const task = await this.prisma.task.findFirst({
      where: { id: input.taskId, workspaceId: input.workspaceId, deletedAt: null },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    if (!task) {
      throw new AppError({ code: "TASK_NOT_FOUND" });
    }
    return task;
  }

  async createTask(input: {
    actorUserId: string;
    workspaceId: string;
    title: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
    labels?: string[];
  }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const title = this.requireTitle(input.title);
    const status = this.parseTaskStatus(input.status, "status", "todo");
    const priority = this.parseTaskPriority(input.priority, "priority", "medium");
    const dueDate = this.parseDueDate(input.dueDate);
    const labels = this.normalizeLabels(input.labels);
    await this.assertAssignee(input.workspaceId, input.assigneeId ?? null);
    const maxTask = await this.prisma.task.findFirst({
      where: { workspaceId: input.workspaceId, status, deletedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const nextPosition = maxTask ? Number(maxTask.position) + 1 : 1;

    const task = await this.prisma.task.create({
      data: {
        workspaceId: input.workspaceId,
        title,
        description: this.normalizeDescription(input.description),
        status,
        priority,
        assigneeId: input.assigneeId ?? null,
        reporterId: input.actorUserId,
        dueDate,
        labels,
        position: new Prisma.Decimal(nextPosition),
      },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    await this.safeTaskSideEffect("task created activity", () =>
      this.emitTaskMutation({
          task,
          actorUserId: input.actorUserId,
          event: "task:created",
          actionKey: "task.created",
          summary: `Task created: ${task.title}`,
        }),
      );

    return task;
  }

  async updateTask(input: {
    actorUserId: string;
    workspaceId: string;
    taskId: string;
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    dueDate?: string | null;
    labels?: string[];
  }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const task = await this.getTaskById(input);
    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) data.title = this.requireTitle(input.title);
    if (input.description !== undefined) data.description = this.normalizeDescription(input.description);
    if (input.priority !== undefined) data.priority = this.parseTaskPriority(input.priority, "priority");
    if (input.dueDate !== undefined) data.dueDate = this.parseDueDate(input.dueDate);
    if (input.labels !== undefined) data.labels = this.normalizeLabels(input.labels);

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data,
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    await this.emitTaskMutation({
      task: updated,
      actorUserId: input.actorUserId,
      event: "task:updated",
      actionKey: "task.updated",
      summary: `Task updated: ${updated.title}`,
    });
    return updated;
  }

  async assignTask(input: {
    actorUserId: string;
    workspaceId: string;
    taskId: string;
    assigneeId: string | null;
  }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const task = await this.getTaskById(input);
    await this.assertAssignee(input.workspaceId, input.assigneeId);
    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: { assigneeId: input.assigneeId },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    await this.emitTaskMutation({
      task: updated,
      actorUserId: input.actorUserId,
      event: "task:assigned",
      actionKey: "task.assigned",
      summary: `Task assignment updated: ${updated.title}`,
    });
    return updated;
  }

  async updateTaskStatus(input: {
    actorUserId: string;
    workspaceId: string;
    taskId: string;
    status: TaskStatus;
    position?: number;
  }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const task = await this.getTaskById(input);
    const nextStatus = this.parseTaskStatus(input.status, "status");
    if (nextStatus !== task.status && !TASK_TRANSITIONS[task.status].includes(nextStatus)) {
      throw new AppError({
        code: "INVALID_TRANSITION",
        message: `Cannot move task from ${task.status} to ${nextStatus}.`,
      });
    }
    const nextPosition = Number.isFinite(input.position ?? Number.NaN)
      ? Number(input.position)
      : await this.getNextStatusPosition(input.workspaceId, nextStatus);
    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: nextStatus,
        position: new Prisma.Decimal(nextPosition),
      },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    await this.emitTaskMutation({
      task: updated,
      actorUserId: input.actorUserId,
      event: "task:status_changed",
      actionKey: "task.status_changed",
      summary: `Task moved to ${updated.status}: ${updated.title}`,
      fromStatus: task.status,
    });
    return updated;
  }

  async deleteTask(input: { actorUserId: string; workspaceId: string; taskId: string }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const task = await this.getTaskById(input);
    await this.prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });
    await this.emitTaskMutation({
      task,
      actorUserId: input.actorUserId,
      event: "task:deleted",
      actionKey: "task.deleted",
      summary: `Task deleted: ${task.title}`,
    });
    return { message: "Task deleted." };
  }

  async listTaskLinks(input: { actorUserId: string; workspaceId: string; taskId: string }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    return this.prisma.taskDocumentLink.findMany({
      where: { taskId: input.taskId, workspaceId: input.workspaceId, deletedAt: null },
      include: {
        document: {
          select: { id: true, title: true, status: true },
        },
      },
    });
  }

  async linkTaskToDocument(input: {
    actorUserId: string;
    workspaceId: string;
    taskId: string;
    documentId: string;
    anchor?: any;
  }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const [task, document] = await Promise.all([
      this.getTaskById({
        actorUserId: input.actorUserId,
        workspaceId: input.workspaceId,
        taskId: input.taskId,
      }),
      this.prisma.document.findFirst({
        where: { id: input.documentId, workspaceId: input.workspaceId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    if (!document) {
      throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
    }

    const link = await this.prisma.taskDocumentLink.create({
      data: {
        workspaceId: input.workspaceId,
        taskId: input.taskId,
        documentId: input.documentId,
        anchor: input.anchor ?? {},
        createdById: input.actorUserId,
      },
    });

    return link;
  }

  async bulkOperations(input: {
    actorUserId: string;
    workspaceId: string;
    create?: any[];
    deleteIds?: string[];
    updateStatus?: Array<{ id: string; status: TaskStatus }>;
  }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);

    const created = [];
    if (input.create) {
      for (const item of input.create) {
        const task = await this.createTask({
          ...item,
          actorUserId: input.actorUserId,
          workspaceId: input.workspaceId,
        });
        created.push(task);
      }
    }

    let deletedCount = 0;
    if (input.deleteIds?.length) {
      await this.prisma.$transaction(async (tx) => {
        await tx.task.updateMany({
          where: {
            id: { in: input.deleteIds },
            workspaceId: input.workspaceId,
          },
          data: { deletedAt: new Date() },
        });
      });
      deletedCount = input.deleteIds.length;
      for (const taskId of input.deleteIds) {
        this.eventEmitter.emit("task.deleted", {
          workspaceId: input.workspaceId,
          actorId: input.actorUserId,
          taskId,
        });
      }
    }

    const updatedStatus = [];
    if (input.updateStatus) {
      for (const item of input.updateStatus) {
        const task = await this.updateTaskStatus({
          actorUserId: input.actorUserId,
          workspaceId: input.workspaceId,
          taskId: item.id,
          status: item.status,
        });
        updatedStatus.push(task);
      }
    }

    return {
      created,
      deletedCount,
      updatedStatus,
    };
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async safeTaskSideEffect(context: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      this.logger.error(`${context} failed: ${this.toErrorMessage(error)}`);
    }
  }

  private async emitTaskMutation(input: {
    task: {
      id: string;
      workspaceId: string;
      title: string;
      assigneeId: string | null;
      status: TaskStatus;
      position?: Prisma.Decimal | number;
    };
    actorUserId: string;
    event: `task:${string}`;
    actionKey: string;
    summary: string;
    fromStatus?: TaskStatus;
  }) {
    const actor = await this.prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: { fullName: true, avatarUrl: true, email: true, globalRole: true },
    });

    try {
      const activity = await this.prisma.activityEvent.create({
        data: {
          workspaceId: input.task.workspaceId,
          actorId: input.actorUserId,
          actorNameSnapshot: actor?.fullName ?? "Unknown User",
          actorAvatarSnapshot: actor?.avatarUrl ?? null,
          eventKey: input.actionKey,
          summary: input.summary,
          resourceType: ResourceType.task,
          resourceId: input.task.id,
          resourceTitleSnapshot: input.task.title,
          metadata: { taskId: input.task.id },
        },
      });
      await this.prisma.auditLog.create({
        data: {
          severity: "info",
          actionKey: input.actionKey,
          actorId: input.actorUserId,
          actorEmail: actor?.email ?? null,
          actorGlobalRole: actor?.globalRole != null ? String(actor.globalRole) : null,
          workspaceId: input.task.workspaceId,
          targetType: "task",
          targetId: input.task.id,
          metadata: { taskId: input.task.id },
        },
      });
      try {
        this.eventEmitter.emit("activity.recorded", {
          workspaceId: input.task.workspaceId,
          activityEvent: activity as unknown as Record<string, unknown>,
        });
      } catch (error) {
        this.logger.warn(`activity.recorded emit failed: ${this.toErrorMessage(error)}`);
      }
    } catch (error) {
      this.logger.warn(`task activity/audit persistence failed: ${this.toErrorMessage(error)}`);
    }

    this.emitTaskDomainEvents(input);
  }

  private emitTaskDomainEvents(input: {
    task: {
      id: string;
      workspaceId: string;
      assigneeId: string | null;
      status: TaskStatus;
      position?: Prisma.Decimal | number;
    };
    event: `task:${string}`;
    fromStatus?: TaskStatus;
  }): void {
    const position =
      input.task.position !== undefined ? Number(input.task.position) : undefined;

    try {
      if (input.event === "task:created") {
        this.eventEmitter.emit("task.created", {
          workspaceId: input.task.workspaceId,
          taskId: input.task.id,
          status: input.task.status,
        });
      } else if (input.event === "task:assigned") {
        this.eventEmitter.emit("task.assigned", {
          workspaceId: input.task.workspaceId,
          taskId: input.task.id,
          assigneeId: input.task.assigneeId,
        });
      } else if (input.event === "task:status_changed") {
        this.eventEmitter.emit("task.status_changed", {
          workspaceId: input.task.workspaceId,
          taskId: input.task.id,
          toStatus: input.task.status,
          fromStatus: input.fromStatus,
          position,
        });
        if (input.task.status === "done") {
          this.eventEmitter.emit("task.completed", {
            workspaceId: input.task.workspaceId,
            taskId: input.task.id,
          });
        }
      } else if (input.event === "task:deleted") {
        this.eventEmitter.emit("task.deleted", {
          workspaceId: input.task.workspaceId,
          taskId: input.task.id,
        });
      }
    } catch (error) {
      this.logger.warn(`task domain event emit failed: ${this.toErrorMessage(error)}`);
    }
  }

  private async requireWorkspaceMembership(actorUserId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: actorUserId,
        workspaceId,
        isActive: true,
        deletedAt: null,
        workspace: { deletedAt: null, status: "active" },
      },
      select: { role: true },
    });
    if (!membership) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }
    return membership;
  }

  private requireTitle(value: string): string {
    const normalized = String(value ?? "").trim();
    if (!normalized || normalized.length > 200) {
      throw new ValidationAppError({
        message: "Task title must be 1-200 characters.",
        issues: [{ field: "title", rule: "length", message: "Task title must be 1-200 characters." }],
      });
    }
    return normalized;
  }

  private normalizeDescription(value: string | null | undefined): string | null {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    if (normalized.length > 4000) {
      throw new ValidationAppError({
        message: "Task description is too long.",
        issues: [{ field: "description", rule: "max_length", message: "Task description is too long." }],
      });
    }
    return normalized || null;
  }

  private normalizeLabels(value: string[] | undefined): string[] {
    if (!value) return [];
    const deduped = Array.from(new Set(value.map((label) => String(label ?? "").trim()).filter(Boolean)));
    if (deduped.some((label) => label.length > 40)) {
      throw new ValidationAppError({
        message: "Task labels must be 1-40 characters.",
        issues: [{ field: "labels", rule: "length", message: "Task labels must be 1-40 characters." }],
      });
    }
    return deduped;
  }

  private parseDueDate(value: string | null | undefined): Date | null {
    if (value === undefined || value === null || String(value).trim() === "") return null;
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationAppError({
        message: "Due date must be a valid ISO date.",
        issues: [{ field: "dueDate", rule: "isDate", message: "Due date must be a valid ISO date." }],
      });
    }
    return parsed;
  }

  private parseTaskStatus(value: string | undefined, field: string, fallback?: TaskStatus): TaskStatus {
    if (value === undefined && fallback) return fallback;
    if (!value || !TASK_STATUSES.includes(value as TaskStatus)) {
      throw new ValidationAppError({
        message: "Task status is invalid.",
        issues: [{ field, rule: "enum", message: "Task status is invalid." }],
      });
    }
    return value as TaskStatus;
  }

  private parseTaskPriority(value: string | undefined, field: string, fallback?: TaskPriority): TaskPriority {
    if (value === undefined && fallback) return fallback;
    if (!value || !TASK_PRIORITIES.includes(value as TaskPriority)) {
      throw new ValidationAppError({
        message: "Task priority is invalid.",
        issues: [{ field, rule: "enum", message: "Task priority is invalid." }],
      });
    }
    return value as TaskPriority;
  }

  private async assertAssignee(workspaceId: string, assigneeId: string | null): Promise<void> {
    if (!assigneeId) return;
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: assigneeId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!member) {
      throw new ValidationAppError({
        message: "Assignee must be an active workspace member.",
        issues: [{ field: "assigneeId", rule: "exists", message: "Assignee must be an active workspace member." }],
      });
    }
  }

  private async getNextStatusPosition(workspaceId: string, status: TaskStatus): Promise<number> {
    const maxTask = await this.prisma.task.findFirst({
      where: { workspaceId, status, deletedAt: null },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    return maxTask ? Number(maxTask.position) + 1 : 1;
  }
}
