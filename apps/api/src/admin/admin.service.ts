import { Inject, Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider) {}

  private async appendAdminAudit(input: {
    actionKey: string;
    actorId: string;
    actorEmail: string;
    actorGlobalRole: string;
    ipAddress?: string;
    userAgent?: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          severity: "info",
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
    const [totalUsers, totalWorkspaces, activeUsersLast7Days, archiveCount, auditErrorsLast24h] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.workspace.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { deletedAt: null, lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.workspace.count({ where: { deletedAt: null, status: "archived" } }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, severity: "error" },
      }),
    ]);
    return { totalUsers, totalWorkspaces, activeUsersLast7Days, archivedWorkspaces: archiveCount, errorEventsLast24h: auditErrorsLast24h };
  }

  async listUsers(page: number, pageSize: number, search?: string) {
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
        skip: (page - 1) * pageSize,
        take: pageSize,
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
    return user;
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
    const where = {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.workspace.count({ where }),
      this.prisma.workspace.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
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
    page: number,
    pageSize: number,
    severity: string | undefined,
    search: string | undefined,
    actor: { id: string; email: string; globalRole: string; ipAddress?: string; userAgent?: string },
  ) {
    const where = {
      ...(severity ? { severity } : {}),
      ...(search
        ? {
            OR: [
              { actorEmail: { contains: search, mode: "insensitive" as const } },
              { actionKey: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      metadata: { page, pageSize, severity: severity ?? null, query: search ?? null },
    });
    return { items, total };
  }
}
