import { Inject, Injectable } from "@nestjs/common";
import type { WorkspaceRole, WorkspaceType } from "@prisma/client";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { toAuditEventListItem } from "./admin-audit-event.mapper.js";

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {}

  /** Coerce query pagination to integers so Prisma never receives string `take` / `skip`. */
  private normalizeListPaging(page: unknown, pageSize: unknown): { page: number; pageSize: number } {
    const pageSizeNum = Math.min(Math.max(parseInt(String(pageSize), 10) || 20, 1), 100);
    const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
    return { page: pageNum, pageSize: pageSizeNum };
  }

  private formatWorkspaceRoleLabel(workspaceType: WorkspaceType, role: WorkspaceRole): string {
    const bucket: "professional" | "academic" | "general" =
      workspaceType === "academic" ? "academic" : workspaceType === "professional" ? "professional" : "general";
    const maps: Record<typeof bucket, Record<WorkspaceRole, string>> = {
      professional: {
        OWNER: "OWNER",
        ADMIN: "TECH LEAD",
        MANAGER: "PROJECT MANAGER",
        MEMBER: "MEMBER",
        VIEWER: "STAKEHOLDER",
      },
      academic: {
        OWNER: "INSTRUCTOR",
        ADMIN: "ADVISOR",
        MANAGER: "SUPERVISOR",
        MEMBER: "STUDENT",
        VIEWER: "AUDITOR",
      },
      general: {
        OWNER: "OWNER",
        ADMIN: "ADMIN",
        MANAGER: "MANAGER",
        MEMBER: "MEMBER",
        VIEWER: "VIEWER",
      },
    };
    return maps[bucket][role] ?? role;
  }

  private auditDateWhere(dateRange: string | undefined): { createdAt?: { gte: Date } } {
    if (!dateRange || dateRange === "all") return {};
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    if (dateRange === "24h") return { createdAt: { gte: new Date(now - day) } };
    if (dateRange === "7d") return { createdAt: { gte: new Date(now - 7 * day) } };
    if (dateRange === "30d") return { createdAt: { gte: new Date(now - 30 * day) } };
    return {};
  }

  private async appendAdminAudit(input: {
    actionKey: string;
    actorId: string;
    actorEmail: string;
    actorGlobalRole: string;
    severity?: "info" | "warn" | "error";
    ipAddress?: string;
    userAgent?: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          severity: input.severity ?? "info",
          actionKey: input.actionKey,
          actorId: input.actorId,
          actorEmail: input.actorEmail,
          actorGlobalRole: input.actorGlobalRole,
          workspaceId: null,
          targetType: input.targetType ?? "admin",
          targetId: input.targetId ?? null,
          ipAddress: input.ipAddress?.slice(0, 64) ?? null,
          userAgent: input.userAgent ?? null,
          metadata: (input.metadata ?? {}) as never,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[admin] failed to append admin audit trail: ${message}`);
    }
  }

  async overview() {
    const now = Date.now();
    const msDay = 24 * 60 * 60 * 1000;
    const weekAgo = new Date(now - 7 * msDay);
    const dayAgo = new Date(now - msDay);

    /** UTC midnight boundaries for each of the last 7 calendar days, oldest → newest (sparklines). */
    const utcDayRangesOldestFirst = [6, 5, 4, 3, 2, 1, 0].map((daysAgo) => {
      const start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() - daysAgo);
      const end = new Date(start.getTime() + msDay);
      return { start, end };
    });

    const storageQuotaBytes = 10 * 1024 * 1024 * 1024;

    const [
      totalUsers,
      totalWorkspaces,
      activeUsersLast7Days,
      archivedWorkspaces,
      errorEventsLast24h,
      warnEventsLast24h,
      newUsersLast7Days,
      newWorkspacesLast7Days,
      totalDocuments,
      totalTasks,
      totalComments,
      adminCount,
      deactivatedUsers,
      storageAgg,
      eventsTrend,
      activeUsersTrend,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.workspace.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, lastLoginAt: { gte: weekAgo } },
      }),
      this.prisma.workspace.count({ where: { deletedAt: null, status: "archived" } }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: dayAgo }, severity: "error" },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: dayAgo }, severity: "warn" },
      }),
      this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
      this.prisma.workspace.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: { deletedAt: null } }),
      this.prisma.comment.count({ where: { deletedAt: null, isDeleted: false } }),
      this.prisma.user.count({ where: { deletedAt: null, globalRole: "ADMIN" } }),
      this.prisma.user.count({ where: { deletedAt: null, isActive: false } }),
      this.prisma.file.aggregate({
        where: { deletedAt: null },
        _sum: { sizeBytes: true },
      }),
      Promise.all(
        utcDayRangesOldestFirst.map(({ start, end }) =>
          this.prisma.auditLog.count({
            where: { severity: "error", createdAt: { gte: start, lt: end } },
          }),
        ),
      ),
      Promise.all(
        utcDayRangesOldestFirst.map(({ start, end }) =>
          this.prisma.user.count({
            where: { deletedAt: null, lastLoginAt: { gte: start, lt: end } },
          }),
        ),
      ),
    ]);

    const sumBytes = storageAgg._sum.sizeBytes;
    const storageUsedBytes =
      typeof sumBytes === "bigint" ? Number(sumBytes) : typeof sumBytes === "number" ? sumBytes : 0;

    return {
      totalUsers,
      activeUsersLast7Days,
      newUsersLast7Days,
      totalWorkspaces,
      archivedWorkspaces,
      newWorkspacesLast7Days,
      totalDocuments,
      totalTasks,
      totalComments,
      storageUsedBytes,
      storageQuotaBytes,
      adminCount,
      deactivatedUsers,
      warnEventsLast24h,
      errorEventsLast24h,
      eventsTrend,
      activeUsersTrend,
    };
  }

  async listUsers(page: number, pageSize: number, search?: string) {
    const { page: p, pageSize: ps } = this.normalizeListPaging(page, pageSize);
    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * ps,
        take: ps,
      }),
    ]);
    return { items, total };
  }

  async setUserActive(
    userId: string,
    isActive: boolean,
    actor: { id: string; email: string; globalRole: string; ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError({ code: "NOT_FOUND", message: "User not found." });
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { isActive } });
    await this.appendAdminAudit({
      actionKey: isActive ? "admin.user.reactivated" : "admin.user.deactivated",
      actorId: actor.id,
      actorEmail: actor.email,
      actorGlobalRole: actor.globalRole,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      targetType: "user",
      targetId: user.id,
      metadata: { isActive },
    });
    return updated;
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError({ code: "NOT_FOUND", message: "User not found." });

    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
        leftAt: null,
        workspace: { deletedAt: null },
      },
      include: {
        workspace: { select: { id: true, name: true, type: true } },
      },
    });
    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      type: m.workspace.type,
      role: m.role,
      roleLabel: this.formatWorkspaceRoleLabel(m.workspace.type, m.role),
    }));

    const { passwordHash: _omitPassword, ...safe } = user;
    return { ...safe, workspaces };
  }

  async setUserRole(
    userId: string,
    role: "ADMIN" | "USER",
    actor: { id: string; email: string; globalRole: string; ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError({ code: "NOT_FOUND", message: "User not found." });
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { globalRole: role } });
    await this.appendAdminAudit({
      actionKey: role === "ADMIN" ? "admin.user.promoted" : "admin.user.demoted",
      actorId: actor.id,
      actorEmail: actor.email,
      actorGlobalRole: actor.globalRole,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      targetType: "user",
      targetId: user.id,
      metadata: { role },
    });
    return updated;
  }

  async listWorkspaces(page: number, pageSize: number, search?: string) {
    const { page: p, pageSize: ps } = this.normalizeListPaging(page, pageSize);
    const memberWhere = { isActive: true, deletedAt: null, leftAt: null } as const;
    const where = {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.workspace.count({ where }),
      this.prisma.workspace.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * ps,
        take: ps,
        include: {
          owner: { select: { fullName: true, email: true } },
          _count: {
            select: {
              members: { where: memberWhere },
              documents: { where: { deletedAt: null } },
              tasks: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);
    const items = rows.map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      status: w.status,
      ownerName: w.owner.fullName,
      ownerEmail: w.owner.email,
      memberCount: w._count.members,
      documentCount: w._count.documents,
      taskCount: w._count.tasks,
      createdAt: w.createdAt,
    }));
    return { items, total };
  }

  async setWorkspaceArchived(
    workspaceId: string,
    archived: boolean,
    actor: { id: string; email: string; globalRole: string; ipAddress?: string; userAgent?: string },
  ) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null } });
    if (!workspace) throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    const updated = await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: archived ? "archived" : "active" },
    });
    await this.appendAdminAudit({
      actionKey: archived ? "admin.workspace.archived" : "admin.workspace.unarchived",
      actorId: actor.id,
      actorEmail: actor.email,
      actorGlobalRole: actor.globalRole,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      targetType: "workspace",
      targetId: workspace.id,
      metadata: { archived },
    });
    return updated;
  }

  async forceDeleteWorkspace(
    workspaceId: string,
    actor: { id: string; email: string; globalRole: string; ipAddress?: string; userAgent?: string },
  ) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null } });
    if (!workspace) throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    const updated = await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { deletedAt: new Date() },
    });
    await this.appendAdminAudit({
      actionKey: "admin.workspace.force_deleted",
      actorId: actor.id,
      actorEmail: actor.email,
      actorGlobalRole: actor.globalRole,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      targetType: "workspace",
      targetId: workspace.id,
    });
    return updated;
  }

  async listAudit(
    input: {
      page: number;
      pageSize: number;
      severity?: string;
      q?: string;
      eventType?: string;
      dateRange?: string;
    },
    actor: { id: string; email: string; globalRole: string; ipAddress?: string; userAgent?: string },
  ) {
    const { page: p, pageSize: ps } = this.normalizeListPaging(input.page, input.pageSize);
    const sev =
      input.severity === "info" || input.severity === "warn" || input.severity === "error"
        ? input.severity
        : undefined;
    const where = {
      ...this.auditDateWhere(input.dateRange),
      ...(sev ? { severity: sev } : {}),
      ...(input.eventType
        ? { actionKey: { startsWith: input.eventType, mode: "insensitive" as const } }
        : {}),
      ...(input.q
        ? {
            OR: [
              { actorEmail: { contains: input.q, mode: "insensitive" as const } },
              { actionKey: { contains: input.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (p - 1) * ps,
        take: ps,
        include: { actor: { select: { fullName: true } } },
      }),
    ]);
    await this.appendAdminAudit({
      actionKey: "admin.audit.viewed",
      actorId: actor.id,
      actorEmail: actor.email,
      actorGlobalRole: actor.globalRole,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      targetType: "audit_log",
      metadata: {
        page: p,
        pageSize: ps,
        severity: sev ?? null,
        query: input.q ?? null,
        eventType: input.eventType ?? null,
        dateRange: input.dateRange ?? null,
      },
    });
    return { items: rows.map(toAuditEventListItem), total };
  }
}
