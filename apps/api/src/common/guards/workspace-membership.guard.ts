import { Inject, type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { WorkspaceRole } from "@prisma/client";
import type { Request } from "express";
import { AppError, ValidationAppError } from "../filters/app-error.filter.js";
import { PrismaClientProvider } from "../prisma/prisma-client.provider.js";
import { WORKSPACE_ROLE_KEY } from "../decorators/workspace-role.decorator.js";
import { isDatabaseUuidParam } from "../auth/request-user.js";

const roleRank: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  MANAGER: 3,
  ADMIN: 4,
  OWNER: 5,
};

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const READ_METHODS = new Set(["GET", "HEAD"]);

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

    // Step 1: find workspace
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: trimmedWorkspaceId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!workspace) {
      throw new AppError({
        code: "WORKSPACE_NOT_FOUND",
        message: "Workspace not found.",
      });
    }

    // Step 2: archived workspace is read-only for writes
    const isWriteMethod = WRITE_METHODS.has(request.method);
    if (isWriteMethod && workspace.status === "archived") {
      throw new AppError({
        code: "WORKSPACE_ARCHIVED_READONLY",
        message: "Workspace is archived and read-only.",
      });
    }

    // Step 3: find active membership
    const member = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: trimmedWorkspaceId,
        userId,
        isActive: true,
        deletedAt: null,
        leftAt: null,
      },
      select: {
        id: true,
        role: true,
        workspaceId: true,
        user: {
          select: { fullName: true },
        },
      },
    });

    if (member) {
      this.attachWorkspaceContext(request, workspace, member);
      this.assertMinimumRole(context, member.role);
      return true;
    }

    // Platform-admin read bypass (GET/HEAD only, DB globalRole is source of truth)
    if (READ_METHODS.has(request.method)) {
      const dbUser = await this.prisma.user.findFirst({
        where: { id: userId, deletedAt: null },
        select: { globalRole: true },
      });
      if (dbUser?.globalRole === "ADMIN") {
        const syntheticRole: WorkspaceRole = "VIEWER";
        request.workspace = workspace;
        request.workspaceMember = {
          id: "00000000-0000-4000-8000-000000000001",
          role: syntheticRole,
          workspaceId: trimmedWorkspaceId,
          workspace,
          user: { fullName: null },
        };
        this.assertMinimumRole(context, syntheticRole);
        return true;
      }
    }

    throw new AppError({
      code: "NOT_WORKSPACE_MEMBER",
      message: "You are not a member of this workspace.",
    });
  }

  private attachWorkspaceContext(
    request: Request,
    workspace: { id: string; status: string },
    member: {
      id: string;
      role: WorkspaceRole;
      workspaceId: string;
      user: { fullName: string | null };
    },
  ): void {
    request.workspace = workspace;
    request.workspaceMember = {
      id: member.id,
      role: member.role,
      workspaceId: member.workspaceId,
      workspace,
      user: member.user,
    };
  }

  private assertMinimumRole(context: ExecutionContext, actualRole: WorkspaceRole): void {
    const requiredRole = this.reflector.getAllAndOverride<WorkspaceRole | undefined>(
      WORKSPACE_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRole) {
      return;
    }
    if (roleRank[actualRole] < roleRank[requiredRole]) {
      throw new AppError({
        code: "INSUFFICIENT_ROLE",
        message: "Your workspace role is insufficient for this action.",
      });
    }
  }
}
