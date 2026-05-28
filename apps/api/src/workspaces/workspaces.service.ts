import type { Prisma, WorkspaceRole, WorkspaceStatus, WorkspaceType } from "@prisma/client";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { RedisPublishService } from "../common/redis/redis-publish.service.js";
import { canAssignRole, canManageMember } from "./workspaces.policy.js";
import {
  applyWorkspaceTemplate,
  buildDefaultWorkspaceSettings,
  extractRoleLabelsFromSettings,
  parseWorkspaceTemplateContent,
  type WorkspaceRoleLabelsMap,
} from "./workspace-template.application.js";
const COLLAB_PERMISSION_CHANNEL = "collab:permission-changed";

type WorkspaceMembership = {
  id: string;
  role: WorkspaceRole;
  workspaceId: string;
};

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisPublish: RedisPublishService,
  ) {}

  async createWorkspace({
    actorUserId,
    name,
    description,
    icon,
    type,
    templateId,
  }: {
    actorUserId: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    type: WorkspaceType;
    templateId?: string | null;
  }) {
    const activeWorkspaceCount = await this.prisma.workspaceMember.count({
      where: {
        userId: actorUserId,
        isActive: true,
        deletedAt: null,
        workspace: { deletedAt: null },
      },
    });

    if (activeWorkspaceCount >= 20) {
      throw new AppError({ code: "WORKSPACE_LIMIT_REACHED" });
    }

    const existingWorkspace = await this.prisma.workspace.findFirst({
      where: {
        ownerId: actorUserId,
        name,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingWorkspace) {
      throw new AppError({ code: "WORKSPACE_NAME_CONFLICT" });
    }

    const template = templateId
      ? await this.prisma.template.findFirst({
        where: {
          id: templateId,
          isEnabled: true,
        },
        select: {
          id: true,
          kind: true,
          category: true,
          content: true,
        },
      })
      : null;

    if (templateId && !template) {
      throw new AppError({ code: "TEMPLATE_NOT_FOUND" });
    }

    if (template && template.category !== type) {
      throw new AppError({ code: "TEMPLATE_CATEGORY_MISMATCH" });
    }

    if (template && template.kind !== "workspace") {
      throw new AppError({ code: "TEMPLATE_INVALID" });
    }

    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          description: description ?? null,
          icon: icon ?? null,
          type,
          status: "active",
          ownerId: actorUserId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: actorUserId,
          role: "OWNER",
          isActive: true,
          joinedAt: now,
          lastAccessedAt: now,
        },
      });

      await tx.workspaceSettings.create({
        data: {
          workspaceId: workspace.id,
          settings: buildDefaultWorkspaceSettings(type),
        },
      });

      // Baseline task columns for workspaces without templates.
      await tx.taskColumn.createMany({
        data: [
          { workspaceId: workspace.id, name: "Backlog", status: "backlog", position: 1 },
          { workspaceId: workspace.id, name: "To do", status: "todo", position: 2 },
          { workspaceId: workspace.id, name: "In progress", status: "in_progress", position: 3 },
          { workspaceId: workspace.id, name: "Review", status: "in_review", position: 4 },
          { workspaceId: workspace.id, name: "Done", status: "done", position: 5 },
        ],
      });

      if (template) {
        const parsed = parseWorkspaceTemplateContent(template.content);
        await applyWorkspaceTemplate({
          tx,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspaceType: type,
          actorUserId,
          templateContent: parsed,
        });
      }

      return workspace;
    });

    this.eventEmitter?.emit?.("workspace.updated", {
      workspaceId: created.id,
      changes: { created: true },
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      type: created.type,
      icon: created.icon,
      createdAt: created.createdAt,
    };
  }

  async updateWorkspaceSettings({
    actorUserId,
    workspaceId,
    name,
    description,
    icon,
  }: {
    actorUserId: string;
    workspaceId: string;
    name?: string;
    description?: string | null;
    icon?: string | null;
  }) {
    const membership = await this.findActorMembership({ userId: actorUserId, workspaceId });
    this.assertAdminOrOwner(membership.role);

    const workspace = await this.getWorkspaceOrThrow(workspaceId);

    const data: Prisma.WorkspaceUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) {
      data.description = description === null ? { set: null } : description;
    }
    if (icon !== undefined) {
      data.icon = icon === null ? { set: null } : icon;
    }

    const updated = await this.prisma.workspace.update({
      where: { id: workspace.id },
      data,
      select: {
        id: true,
        updatedAt: true,
      },
    });

    this.eventEmitter.emit("workspace.settings_updated", {
      workspaceId: updated.id,
      settings: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(icon !== undefined ? { icon } : {}),
      },
    });

    return { workspaceId: updated.id, updatedAt: updated.updatedAt };
  }

  async setWorkspaceArchivedStatus({
    actorUserId,
    workspaceId,
    status,
  }: {
    actorUserId: string;
    workspaceId: string;
    status: Extract<WorkspaceStatus, "active" | "archived">;
  }) {
    const membership = await this.findActorMembership({ userId: actorUserId, workspaceId });
    this.assertAdminOrOwner(membership.role);

    const workspace = await this.getWorkspaceOrThrow(workspaceId);

    const updated = await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { status },
      select: { id: true, status: true },
    });

    if (updated.status === "archived") {
      this.eventEmitter.emit("workspace.archived", {
        workspaceId: updated.id,
        actorId: actorUserId,
      });
    } else {
      this.eventEmitter.emit("workspace.updated", {
        workspaceId: updated.id,
        changes: { status: updated.status },
      });
    }

    return { workspaceId: updated.id, status: updated.status };
  }

  async deleteWorkspace({
    actorUserId,
    workspaceId,
  }: {
    actorUserId: string;
    workspaceId: string;
  }) {
    const membership = await this.findActorMembership({ userId: actorUserId, workspaceId });
    if (membership.role !== "OWNER") {
      throw new AppError({ code: "FORBIDDEN" });
    }

    const workspace = await this.getWorkspaceOrThrow(workspaceId);
    await this.prisma.workspace.update({
      where: { id: workspace.id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    this.eventEmitter.emit("workspace.updated", {
      workspaceId,
      changes: { deleted: true },
    });

    return { message: "Workspace deleted. It can be restored within 90 days." };
  }

  async transferOwnership({
    actorUserId,
    workspaceId,
    newOwnerUserId,
  }: {
    actorUserId: string;
    workspaceId: string;
    newOwnerUserId: string;
  }) {
    const membership = await this.findActorMembership({ userId: actorUserId, workspaceId });
    if (membership.role !== "OWNER") {
      throw new AppError({ code: "FORBIDDEN" });
    }

    if (newOwnerUserId === actorUserId) {
      throw new AppError({ code: "INVALID_NEW_OWNER" });
    }

    const targetMembership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: newOwnerUserId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, role: true },
    });

    if (!targetMembership) {
      throw new AppError({ code: "MEMBER_NOT_FOUND" });
    }

    if (targetMembership.role !== "ADMIN" && targetMembership.role !== "MANAGER") {
      throw new AppError({
        code: "INVALID_NEW_OWNER",
        message: "New owner must be an Admin or Manager.",
      });
    }

    const workspace = await this.getWorkspaceOrThrow(workspaceId);

    await this.prisma.$transaction(async (tx) => {
      await tx.workspace.update({
        where: { id: workspace.id },
        data: { ownerId: newOwnerUserId },
      });

      await tx.workspaceMember.updateMany({
        where: { workspaceId, userId: newOwnerUserId },
        data: { role: "OWNER" },
      });

      await tx.workspaceMember.updateMany({
        where: { workspaceId, userId: actorUserId },
        data: { role: "ADMIN" },
      });
    });

    this.eventEmitter.emit("workspace.updated", {
      workspaceId,
      changes: { ownerId: newOwnerUserId },
    });

    return { workspaceId, newOwnerUserId };
  }

  async listForUser(userId: string) {
    const memberWhere = {
      isActive: true,
      deletedAt: null,
      leftAt: null,
    } as const;

    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
        leftAt: null,
        workspace: { deletedAt: null },
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                documents: true,
                tasks: true,
                members: { where: memberWhere },
              },
            },
            members: {
              where: memberWhere,
              take: 4,
              orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
              include: {
                user: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const workspaceIds = memberships.map((m) => m.workspace.id);
    const settingsRows =
      workspaceIds.length > 0
        ? await this.prisma.workspaceSettings.findMany({
            where: { workspaceId: { in: workspaceIds } },
            select: { workspaceId: true, settings: true },
          })
        : [];
    const roleLabelsByWorkspace = new Map<string, WorkspaceRoleLabelsMap | undefined>(
      settingsRows.map((row) => [row.workspaceId, extractRoleLabelsFromSettings(row.settings)]),
    );

    return memberships.map((membership) => {
      const ws = membership.workspace;
      const { _count, members: previewMembers, ...workspaceCore } = ws;
      return {
        membershipId: membership.id,
        role: membership.role,
        workspace: workspaceCore,
        roleLabels: roleLabelsByWorkspace.get(ws.id),
        memberCount: _count.members,
        documentCount: _count.documents,
        taskCount: _count.tasks,
        recentMembers: previewMembers.map((row) => ({
          id: row.user.id,
          fullName: row.user.fullName,
        })),
      };
    });
  }

  async createFolder({
    actorUserId,
    workspaceId,
    name,
    parentId,
  }: {
    actorUserId: string;
    workspaceId: string;
    name: string;
    parentId?: string | null;
  }) {
    await this.findActorMembership({ userId: actorUserId, workspaceId });

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!workspace) {
      throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    }
    if (workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }

    const trimmed = name.trim();
    if (!trimmed.length) {
      throw new ValidationAppError({
        issues: [
          {
            field: "name",
            message: "Folder name is required.",
            rule: "required",
          },
        ],
      });
    }

    if (parentId) {
      const parent = await this.prisma.folder.findFirst({
        where: {
          id: parentId,
          workspaceId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!parent) {
        throw new AppError({ code: "FOLDER_NOT_FOUND" });
      }
    }

    const maxPosition = await this.prisma.folder.findFirst({
      where: {
        workspaceId,
        parentId: parentId ?? null,
        deletedAt: null,
      },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = maxPosition ? Number(maxPosition.position) + 1 : 1;

    const folder = await this.prisma.folder.create({
      data: {
        workspaceId,
        name: trimmed.slice(0, 120),
        parentId: parentId ?? null,
        position: nextPosition,
        createdById: actorUserId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        position: true,
      },
    });

    return folder;
  }

  async getByIdForUser({
    workspaceId,
    membership,
  }: {
    workspaceId: string;
    membership: WorkspaceMembership;
  }) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!workspace) {
      throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    }

    const settingsRow = await this.prisma.workspaceSettings.findUnique({
      where: { workspaceId },
      select: { settings: true },
    });
    const roleLabels = extractRoleLabelsFromSettings(settingsRow?.settings);

    return { membership, workspace, roleLabels };
  }

  async listMembersForUser({ workspaceId }: { workspaceId: string }) {
    return this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  }

  async listTaskColumnsForUser({
    actorUserId,
    workspaceId,
  }: {
    actorUserId: string;
    workspaceId: string;
  }) {
    await this.findActorMembership({ userId: actorUserId, workspaceId });
    return this.prisma.taskColumn.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
        position: true,
      },
    });
  }

  async listTaskLabelsForUser({
    actorUserId,
    workspaceId,
  }: {
    actorUserId: string;
    workspaceId: string;
  }) {
    await this.findActorMembership({ userId: actorUserId, workspaceId });
    return this.prisma.taskLabel.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
      },
    });
  }

  async createTaskLabelForUser({
    actorUserId,
    workspaceId,
    name,
    color,
    description,
  }: {
    actorUserId: string;
    workspaceId: string;
    name: string;
    color?: string;
    description?: string | null;
  }) {
    const membership = await this.findActorMembership({ userId: actorUserId, workspaceId });
    this.assertAdminOrOwner(membership.role);

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!workspace) {
      throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    }
    if (workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }

    const trimmed = name.trim().toLowerCase();
    if (!trimmed || trimmed.length > 50) {
      throw new ValidationAppError({
        issues: [
          {
            field: "name",
            rule: "length",
            message: "Label name must be 1-50 characters.",
          },
        ],
      });
    }

    const existing = await this.prisma.taskLabel.findFirst({
      where: {
        workspaceId,
        name: trimmed,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new AppError({ code: "VALIDATION_ERROR", message: "A label with this name already exists." });
    }

    const normalizedColor = /^#[0-9a-fA-F]{6}$/.test(color ?? "")
      ? color!
      : "#64748b";

    return this.prisma.taskLabel.create({
      data: {
        workspaceId,
        name: trimmed,
        color: normalizedColor,
        description: description?.trim() || null,
        createdById: actorUserId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
      },
    });
  }

  async getWorkspaceMemberPeerProfile({
    actorUserId,
    workspaceId,
    targetUserId,
  }: {
    actorUserId: string;
    workspaceId: string;
    targetUserId: string;
  }) {
    const actorUser = await this.prisma.user.findFirst({
      where: { id: actorUserId, deletedAt: null },
      select: { globalRole: true },
    });
    if (!actorUser) {
      throw new AppError({ code: "UNAUTHORIZED" });
    }

    const actorMembership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorUserId,
        isActive: true,
        deletedAt: null,
        workspace: { deletedAt: null },
      },
      select: {
        id: true,
        role: true,
        workspaceId: true,
      },
    });

    if (!actorMembership && actorUser.globalRole !== "ADMIN") {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }

    const target = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: targetUserId,
        isActive: true,
        deletedAt: null,
        workspace: { deletedAt: null },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    if (!target) {
      throw new AppError({ code: "MEMBER_NOT_FOUND" });
    }

    const privileged =
      actorUser.globalRole === "ADMIN" ||
      actorUserId === targetUserId ||
      (actorMembership !== null && ["OWNER", "ADMIN"].includes(actorMembership.role));

    return {
      membershipId: target.id,
      user: {
        id: target.user.id,
        fullName: target.user.fullName,
        avatarUrl: target.user.avatarUrl,
        ...(privileged ? { email: target.user.email } : {}),
      },
      role: target.role,
      joinedAt: target.joinedAt,
      lastAccessedAt: target.lastAccessedAt,
    };
  }

  async updateMemberRole({
    actorUserId,
    workspaceId,
    membershipId,
    role,
  }: {
    actorUserId: string;
    workspaceId: string;
    membershipId: string;
    role: WorkspaceRole;
  }) {
    const actorMembership = await this.findActorMembership({
      userId: actorUserId,
      workspaceId,
    });
    const targetMembership = await this.findTargetMembership({
      membershipId,
      workspaceId,
    });

    if (targetMembership.role === "OWNER") {
      throw new AppError({ code: "CANNOT_DEMOTE_OWNER" });
    }

    if (
      !canManageMember({ actorRole: actorMembership.role, targetRole: targetMembership.role }) ||
      !canAssignRole({ actorRole: actorMembership.role, targetRole: role })
    ) {
      throw new AppError({ code: "FORBIDDEN_ROLE_ASSIGNMENT" });
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { id: targetMembership.id },
      data: { role },
    });

    try {
      this.eventEmitter.emit("workspace.member_role_changed", {
        workspaceId,
        userId: targetMembership.userId,
        newRole: role,
        oldRole: targetMembership.role,
      });
    } catch (error) {
      // Realtime/event fan-out failures should never block membership persistence.
      console.warn("[WorkspacesService] workspace.member_role_changed emit failed", error);
    }

    await this.redisPublish.publish(
      COLLAB_PERMISSION_CHANNEL,
      JSON.stringify({ userId: targetMembership.userId, workspaceId, newRole: role }),
    );

    return updated;
  }

  async removeMember({
    actorUserId,
    workspaceId,
    membershipId,
  }: {
    actorUserId: string;
    workspaceId: string;
    membershipId: string;
  }) {
    const actorMembership = await this.findActorMembership({
      userId: actorUserId,
      workspaceId,
    });
    const targetMembership = await this.findTargetMembership({
      membershipId,
      workspaceId,
    });

    if (targetMembership.role === "OWNER") {
      throw new AppError({ code: "CANNOT_REMOVE_OWNER" });
    }

    if (
      !canManageMember({ actorRole: actorMembership.role, targetRole: targetMembership.role }) ||
      targetMembership.userId === actorUserId
    ) {
      throw new AppError({ code: "FORBIDDEN" });
    }

    const removed = await this.prisma.workspaceMember.update({
      where: { id: targetMembership.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    this.eventEmitter.emit("workspace.member_removed", {
      workspaceId,
      userId: targetMembership.userId,
    });

    return removed;
  }

  private async findActorMembership({
    userId,
    workspaceId,
  }: {
    userId: string;
    workspaceId: string;
  }): Promise<WorkspaceMembership> {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        isActive: true,
        deletedAt: null,
        workspace: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        role: true,
        workspaceId: true,
      },
    });

    if (!membership) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }

    return membership;
  }

  private async findTargetMembership({
    membershipId,
    workspaceId,
  }: {
    membershipId: string;
    workspaceId: string;
  }) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        id: membershipId,
        workspaceId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
        userId: true,
      },
    });

    if (!membership) {
      throw new AppError({ code: "MEMBER_NOT_FOUND" });
    }

    return membership;
  }

  private assertAdminOrOwner(role: WorkspaceRole) {
    if (role === "OWNER" || role === "ADMIN") {
      return;
    }
    throw new AppError({ code: "FORBIDDEN" });
  }

  private async getWorkspaceOrThrow(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!workspace) {
      throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    }
    return workspace;
  }
}
