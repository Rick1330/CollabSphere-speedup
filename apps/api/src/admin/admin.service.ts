import { Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaClientProvider) {}

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

  async setUserActive(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError({ code: "NOT_FOUND", message: "User not found." });
    return this.prisma.user.update({ where: { id: user.id }, data: { isActive } });
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError({ code: "NOT_FOUND", message: "User not found." });
    return user;
  }

  async setUserRole(userId: string, role: "ADMIN" | "USER") {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError({ code: "NOT_FOUND", message: "User not found." });
    return this.prisma.user.update({ where: { id: user.id }, data: { globalRole: role } });
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

  async setWorkspaceArchived(workspaceId: string, archived: boolean) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null } });
    if (!workspace) throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    return this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: archived ? "archived" : "active" },
    });
  }

  async forceDeleteWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null } });
    if (!workspace) throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    return this.prisma.workspace.update({ where: { id: workspace.id }, data: { deletedAt: new Date() } });
  }

  async listAudit(page: number, pageSize: number, severity?: string, search?: string) {
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
    return { items, total };
  }
}
