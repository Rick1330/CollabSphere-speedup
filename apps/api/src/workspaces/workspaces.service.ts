import type { WorkspaceRole } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { canAssignRole, canManageMember } from "./workspaces.policy.js";

type WorkspaceMembership = {
  id: string;
  role: WorkspaceRole;
  workspaceId: string;
};

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaClientProvider) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null,
        workspace: { deletedAt: null },
      },
      include: {
        workspace: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return memberships.map((membership) => ({
      membershipId: membership.id,
      role: membership.role,
      workspace: membership.workspace,
    }));
  }

  async getByIdForUser({ userId, workspaceId }: { userId: string; workspaceId: string }) {
    const membership = await this.findActorMembership({ userId, workspaceId });
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
      },
    });

    if (!workspace) {
      throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    }

    return { membership, workspace };
  }

  async listMembersForUser({ userId, workspaceId }: { userId: string; workspaceId: string }) {
    await this.findActorMembership({ userId, workspaceId });

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

    return this.prisma.workspaceMember.update({
      where: { id: targetMembership.id },
      data: { role },
    });
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

    return this.prisma.workspaceMember.update({
      where: { id: targetMembership.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
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
}
