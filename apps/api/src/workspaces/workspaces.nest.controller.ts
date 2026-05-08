import type { WorkspaceRole } from "@prisma/client";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
} from "@nestjs/common";
import { resolveRequestUserId } from "../common/auth/request-user.js";
import { ValidationAppError } from "../common/filters/app-error.filter.js";
import {
  createSingleResourcePayload,
  createListResponsePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { WorkspacesService } from "./workspaces.service.js";

type UpdateWorkspaceMemberRoleBody = {
  role: WorkspaceRole;
};

const validWorkspaceRoles: WorkspaceRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];

@Controller("workspaces")
export class WorkspacesNestController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async listWorkspaces(@Headers("x-user-id") userIdHeader: unknown) {
    const userId = resolveRequestUserId(userIdHeader);
    const data = await this.workspacesService.listForUser(userId);
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: data, total: data.length }),
      requestId: "nest-request",
    });
  }

  @Get(":workspaceId")
  async getWorkspace(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const userId = resolveRequestUserId(userIdHeader);
    const data = await this.workspacesService.getByIdForUser({ userId, workspaceId });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  @Get(":workspaceId/members")
  async listMembers(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const userId = resolveRequestUserId(userIdHeader);
    const data = await this.workspacesService.listMembersForUser({ userId, workspaceId });
    return wrapSuccessResponse({
      payload: createListResponsePayload({ items: data, total: data.length }),
      requestId: "nest-request",
    });
  }

  @Patch(":workspaceId/members/:membershipId/role")
  async updateMemberRole(
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
    @Headers("x-user-id") userIdHeader: unknown,
    @Body() body: UpdateWorkspaceMemberRoleBody,
  ) {
    const userId = resolveRequestUserId(userIdHeader);
    const nextRole = this.validateRole(body);
    const data = await this.workspacesService.updateMemberRole({
      actorUserId: userId,
      workspaceId,
      membershipId,
      role: nextRole,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  @Delete(":workspaceId/members/:membershipId")
  async removeMember(
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const userId = resolveRequestUserId(userIdHeader);
    const data = await this.workspacesService.removeMember({
      actorUserId: userId,
      workspaceId,
      membershipId,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  private validateRole(body: UpdateWorkspaceMemberRoleBody): WorkspaceRole {
    if (typeof body?.role !== "string") {
      throw new ValidationAppError({
        message: "Role is required.",
        issues: [{ field: "role", rule: "required", message: "Role is required." }],
      });
    }

    if (!validWorkspaceRoles.includes(body.role)) {
      throw new ValidationAppError({
        message: "Role is invalid.",
        issues: [{ field: "role", rule: "enum", message: "Role is invalid." }],
      });
    }

    return body.role;
  }
}
