import { Inject, type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { WorkspaceRole } from "@prisma/client";
import type { Request } from "express";
import { AppError } from "../filters/app-error.filter.js";
import { PrismaClientProvider } from "../prisma/prisma-client.provider.js";
import { WORKSPACE_MIN_ROLE_KEY } from "../decorators/workspace-role.decorator.js";

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
    private readonly reflector: Reflector,
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawWorkspaceId = request.params["workspaceId"];
    const workspaceId = Array.isArray(rawWorkspaceId) ? rawWorkspaceId[0] : rawWorkspaceId;
    if (!workspaceId || typeof workspaceId !== "string") {
      return true;
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
        workspaceId,
        userId,
        leftAt: null,
      },
      select: {
        role: true,
        workspace: {
          select: { id: true, status: true },
        },
      },
    });

    if (!member) {
      throw new AppError({
        code: "NOT_WORKSPACE_MEMBER",
        message: "You are not a member of this workspace.",
      });
    }

    const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
    if (isWriteMethod && member.workspace.status === "archived") {
      throw new AppError({
        code: "WORKSPACE_ARCHIVED_READONLY",
        message: "Workspace is archived and read-only.",
      });
    }

    // Attach to request for use in decorators/handlers
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
}
