import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaClientProvider) {}

  private async requireWorkspaceMembership(actorUserId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: actorUserId, isActive: true, deletedAt: null },
      select: { role: true },
    });
    if (!membership) throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    return membership;
  }

  async createFolder(input: { actorUserId: string; workspaceId: string; name: string; parentId?: string | null }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const name = input.name.trim();
    if (!name || name.length > 120) {
      throw new ValidationAppError({
        message: "Folder name must be 1-120 characters.",
        issues: [{ field: "name", rule: "length", message: "Folder name must be 1-120 characters." }],
      });
    }
    if (input.parentId) {
      const parent = await this.prisma.folder.findFirst({ where: { id: input.parentId, workspaceId: input.workspaceId, deletedAt: null }, select: { id: true } });
      if (!parent) throw new AppError({ code: "FOLDER_NOT_FOUND" });
    }
    const maxPos = await this.prisma.folder.findFirst({ where: { workspaceId: input.workspaceId, parentId: input.parentId ?? null, deletedAt: null }, orderBy: { position: "desc" }, select: { position: true } });
    const nextPosition = maxPos ? Number(maxPos.position) + 1 : 1;
    return this.prisma.folder.create({
      data: {
        workspaceId: input.workspaceId,
        name,
        parentId: input.parentId ?? null,
        createdById: input.actorUserId,
        position: new Prisma.Decimal(nextPosition),
      },
      select: { id: true, name: true, parentId: true, position: true, createdAt: true, updatedAt: true },
    });
  }

  async renameFolder(input: { actorUserId: string; workspaceId: string; folderId: string; name: string }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const name = input.name.trim();
    if (!name || name.length > 120) {
      throw new ValidationAppError({
        message: "Folder name must be 1-120 characters.",
        issues: [{ field: "name", rule: "length", message: "Folder name must be 1-120 characters." }],
      });
    }
    const folder = await this.prisma.folder.findFirst({ where: { id: input.folderId, workspaceId: input.workspaceId, deletedAt: null }, select: { id: true } });
    if (!folder) throw new AppError({ code: "FOLDER_NOT_FOUND" });
    return this.prisma.folder.update({
      where: { id: input.folderId },
      data: { name },
      select: { id: true, name: true, parentId: true, position: true, createdAt: true, updatedAt: true },
    });
  }

  async deleteFolder(input: { actorUserId: string; workspaceId: string; folderId: string }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const folder = await this.prisma.folder.findFirst({ where: { id: input.folderId, workspaceId: input.workspaceId, deletedAt: null }, select: { id: true } });
    if (!folder) throw new AppError({ code: "FOLDER_NOT_FOUND" });

    const [childCount, docsCount] = await Promise.all([
      this.prisma.folder.count({ where: { workspaceId: input.workspaceId, parentId: input.folderId, deletedAt: null } }),
      this.prisma.document.count({ where: { workspaceId: input.workspaceId, folderId: input.folderId, deletedAt: null } }),
    ]);
    if (childCount > 0 || docsCount > 0) {
      throw new AppError({ code: "FOLDER_NOT_EMPTY", message: "Folder is not empty." });
    }
    await this.prisma.folder.update({ where: { id: input.folderId }, data: { deletedAt: new Date() } });
    return { message: "Folder deleted." };
  }
}
