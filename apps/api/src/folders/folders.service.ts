import { Inject, Injectable } from "@nestjs/common";
import { Prisma, type WorkspaceRole } from "@prisma/client";
import {
  canCreateWorkspaceContent,
  canDeleteWorkspaceContent,
  canOrganizeWorkspaceContent,
} from "../../../../packages/shared/src/collab/workspace-content-policy.js";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { RealtimeEventsService } from "../realtime/realtime-events.service.js";

const MAX_FOLDER_DEPTH = 10;

@Injectable()
export class FoldersService {
  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    private readonly realtimeEvents?: RealtimeEventsService,
  ) {}

  private assertOrganize(role: WorkspaceRole) {
    if (!canOrganizeWorkspaceContent(role)) {
      throw new AppError({
        code: "INSUFFICIENT_ROLE",
        message: "Member role or higher is required.",
      });
    }
  }

  private assertDelete(role: WorkspaceRole) {
    if (!canDeleteWorkspaceContent(role)) {
      throw new AppError({
        code: "INSUFFICIENT_ROLE",
        message: "Manager role or higher is required.",
      });
    }
  }

  private async requireWorkspaceMembership(actorUserId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: actorUserId, isActive: true, deletedAt: null, leftAt: null },
      select: { role: true },
    });
    if (!membership) throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    return membership;
  }

  private async folderDepth(workspaceId: string, folderId: string): Promise<number> {
    let depth = 1;
    let cursor: string | null = folderId;
    while (cursor) {
      const row = await this.prisma.folder.findFirst({
        where: { id: cursor, workspaceId, deletedAt: null },
        select: { parentId: true },
      });
      if (!row?.parentId) break;
      depth += 1;
      cursor = row.parentId;
      if (depth > MAX_FOLDER_DEPTH) break;
    }
    return depth;
  }

  private async assertFolderDepthWithinLimit(workspaceId: string, parentId: string | null) {
    if (!parentId) return;
    const parentDepth = await this.folderDepth(workspaceId, parentId);
    if (parentDepth >= MAX_FOLDER_DEPTH) {
      throw new AppError({ code: "VALIDATION_ERROR", message: "Maximum folder nesting depth reached." });
    }
  }

  async createFolder(input: { actorUserId: string; workspaceId: string; name: string; parentId?: string | null }) {
    const membership = await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    if (!canCreateWorkspaceContent(membership.role)) {
      throw new AppError({ code: "INSUFFICIENT_ROLE", message: "Member role or higher is required." });
    }
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
      const parentDepth = await this.folderDepth(input.workspaceId, input.parentId);
      if (parentDepth >= MAX_FOLDER_DEPTH) {
        throw new AppError({ code: "VALIDATION_ERROR", message: "Maximum folder nesting depth reached." });
      }
    }
    const maxPos = await this.prisma.folder.findFirst({ where: { workspaceId: input.workspaceId, parentId: input.parentId ?? null, deletedAt: null }, orderBy: { position: "desc" }, select: { position: true } });
    const nextPosition = maxPos ? Number(maxPos.position) + 1 : 1;
    const folder = await this.prisma.folder.create({
      data: {
        workspaceId: input.workspaceId,
        name,
        parentId: input.parentId ?? null,
        createdById: input.actorUserId,
        position: new Prisma.Decimal(nextPosition),
      },
      select: { id: true, name: true, parentId: true, position: true, createdAt: true, updatedAt: true },
    });
    this.realtimeEvents?.emit("workspace:folder_created", {
      workspaceId: input.workspaceId,
      userId: input.actorUserId,
      data: { folderId: folder.id, parentId: folder.parentId },
    });
    return folder;
  }

  private async assertValidParent(
    workspaceId: string,
    folderId: string,
    parentId: string | null,
  ) {
    if (!parentId) return;
    if (parentId === folderId) {
      throw new AppError({ code: "VALIDATION_ERROR", message: "A folder cannot be its own parent." });
    }
    const parent = await this.prisma.folder.findFirst({
      where: { id: parentId, workspaceId, deletedAt: null },
      select: { id: true, parentId: true },
    });
    if (!parent) throw new AppError({ code: "FOLDER_NOT_FOUND", message: "Parent folder not found." });

    let cursor: string | null = parentId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === folderId) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Cannot move a folder into its own descendant.",
        });
      }
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const row = await this.prisma.folder.findFirst({
        where: { id: cursor, workspaceId, deletedAt: null },
        select: { parentId: true },
      });
      cursor = row?.parentId ?? null;
    }
  }

  async updateFolder(input: {
    actorUserId: string;
    workspaceId: string;
    folderId: string;
    name?: string;
    parentId?: string | null;
  }) {
    const membership = await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    if (!canOrganizeWorkspaceContent(membership.role)) {
      throw new AppError({ code: "INSUFFICIENT_ROLE", message: "Cannot update folders in this workspace." });
    }
    const folder = await this.prisma.folder.findFirst({
      where: { id: input.folderId, workspaceId: input.workspaceId, deletedAt: null },
      select: { id: true, name: true, parentId: true },
    });
    if (!folder) throw new AppError({ code: "FOLDER_NOT_FOUND" });

    const data: { name?: string; parentId?: string | null } = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name || name.length > 120) {
        throw new ValidationAppError({
          message: "Folder name must be 1-120 characters.",
          issues: [{ field: "name", rule: "length", message: "Folder name must be 1-120 characters." }],
        });
      }
      data.name = name;
    }
    if (input.parentId !== undefined) {
      const parentId = input.parentId ?? null;
      await this.assertValidParent(input.workspaceId, input.folderId, parentId);
      await this.assertFolderDepthWithinLimit(input.workspaceId, parentId);
      data.parentId = parentId;
    }
    if (Object.keys(data).length === 0) {
      return this.prisma.folder.findFirstOrThrow({
        where: { id: input.folderId },
        select: { id: true, name: true, parentId: true, position: true, createdAt: true, updatedAt: true },
      });
    }

    const updated = await this.prisma.folder.update({
      where: { id: input.folderId },
      data,
      select: { id: true, name: true, parentId: true, position: true, createdAt: true, updatedAt: true },
    });
    this.realtimeEvents?.emit("workspace:folder_updated", {
      workspaceId: input.workspaceId,
      userId: input.actorUserId,
      data: { folderId: updated.id, parentId: updated.parentId, name: updated.name },
    });
    return updated;
  }

  async deleteFolder(input: { actorUserId: string; workspaceId: string; folderId: string }) {
    const membership = await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    if (!canDeleteWorkspaceContent(membership.role)) {
      throw new AppError({ code: "INSUFFICIENT_ROLE", message: "Cannot delete folders in this workspace." });
    }
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
    this.realtimeEvents?.emit("workspace:folder_deleted", {
      workspaceId: input.workspaceId,
      userId: input.actorUserId,
      data: { folderId: input.folderId },
    });
    return { message: "Folder deleted." };
  }
}
