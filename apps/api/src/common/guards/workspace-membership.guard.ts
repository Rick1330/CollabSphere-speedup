import { Inject, type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { WorkspaceRole } from "@prisma/client";
import type { Request } from "express";
import { AppError, ValidationAppError } from "../filters/app-error.filter.js";
import { PrismaClientProvider } from "../prisma/prisma-client.provider.js";
import { WORKSPACE_MIN_ROLE_KEY } from "../decorators/workspace-role.decorator.js";
import { isDatabaseUuidParam } from "../auth/request-user.js";

const roleRank: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
  VIEWER: 0,
};

@Injectable()
export class WorkspaceMembershipGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawWorkspaceId = request.params["workspaceId"];
    const workspaceId = Array.isArray(rawWorkspaceId) ? rawWorkspaceId[0] : rawWorkspaceId;
    if (!workspaceId || typeof workspaceId !== "string") {
      return true;
    }

    const trimmedWorkspaceId = workspaceId.trim();
    if (!isDatabaseUuidParam(trimmedWorkspaceId)) {
      throw new ValidationAppError({
        issues: [
          {
            field: "workspaceId",
            message: "Workspace id must be a UUID.",
            rule: "uuid",
          },
        ],
      });
    }

    const userId = request.user?.sub;
    if (!userId) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Missing authentication context.",
      });
    }

    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: trimmedWorkspaceId,
        userId,
        isActive: true,
        deletedAt: null,
        leftAt: null,
        workspace: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        role: true,
        workspaceId: true,
        workspace: {
          select: { id: true, status: true },
        },
      },
    });

    const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);

    if (member) {
      if (isWriteMethod && member.workspace.status === "archived") {
        throw new AppError({
          code: "WORKSPACE_ARCHIVED_READONLY",
          message: "Workspace is archived and read-only.",
        });
      }

      request.workspaceMember = member;
      request.workspace = member.workspace;

      const minRole = this.reflector.getAllAndOverride<WorkspaceRole | undefined>(
        WORKSPACE_MIN_ROLE_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (minRole && roleRank[member.role] < roleRank[minRole]) {
        throw new AppError({
          code: "INSUFFICIENT_ROLE",
          message: "Your workspace role is insufficient for this action.",
        });
      }

      return true;
    }

    const isPlatformAdminRead =
      request.user?.globalRole === "ADMIN" && ["GET", "HEAD"].includes(request.method);
    if (isPlatformAdminRead) {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: trimmedWorkspaceId, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!workspace) {
        throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
      }

      const syntheticRole: WorkspaceRole = "VIEWER";
      request.workspaceMember = {
        id: "00000000-0000-4000-8000-000000000001",
        role: syntheticRole,
        workspaceId: trimmedWorkspaceId,
        workspace,
      };
      request.workspace = workspace;

      const minRole = this.reflector.getAllAndOverride<WorkspaceRole | undefined>(
        WORKSPACE_MIN_ROLE_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (minRole && roleRank[syntheticRole] < roleRank[minRole]) {
        throw new AppError({
          code: "INSUFFICIENT_ROLE",
          message: "Your workspace role is insufficient for this action.",
        });
      }

      return true;
    }

    throw new AppError({
      code: "NOT_WORKSPACE_MEMBER",
      message: "You are not a member of this workspace.",
    });
  }
}
