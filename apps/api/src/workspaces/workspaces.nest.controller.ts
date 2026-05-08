import type { WorkspaceRole, WorkspaceType } from "@prisma/client";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { resolveRequestUserId } from "../common/auth/request-user.js";
import { ValidationAppError } from "../common/filters/app-error.filter.js";
import {
  createActionResponsePayload,
  createSingleResourcePayload,
  createListResponsePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { WorkspacesService } from "./workspaces.service.js";

type UpdateWorkspaceMemberRoleBody = {
  role: WorkspaceRole;
};

type CreateWorkspaceBody = {
  name: string;
  description?: string | null;
  icon?: string | null;
  type: WorkspaceType;
  templateId?: string | null;
};

type UpdateWorkspaceBody = {
  name?: string | null;
  description?: string | null;
  icon?: string | null;
};

type TransferOwnershipBody = {
  newOwnerUserId: string;
};

const validWorkspaceRoles: WorkspaceRole[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];
const validWorkspaceTypes: WorkspaceType[] = ["professional", "academic", "general"];

@Controller("workspaces")
export class WorkspacesNestController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async createWorkspace(
    @Headers("x-user-id") userIdHeader: unknown,
    @Body() body: CreateWorkspaceBody,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const payload = this.validateCreateWorkspace(body);
    const data = await this.workspacesService.createWorkspace({
      actorUserId,
      ...payload,
    });

    return {
      statusCode: 201,
      ...wrapSuccessResponse({
        payload: createSingleResourcePayload({ workspace: data }),
        requestId: "nest-request",
      }),
    };
  }

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

  @Put(":workspaceId")
  async updateWorkspace(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
    @Body() body: UpdateWorkspaceBody,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const payload = this.validateUpdateWorkspace(body);
    const data = await this.workspacesService.updateWorkspaceSettings({
      actorUserId,
      workspaceId,
      ...payload,
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  @Post(":workspaceId/archive")
  async archiveWorkspace(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const data = await this.workspacesService.setWorkspaceArchivedStatus({
      actorUserId,
      workspaceId,
      status: "archived",
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  @Post(":workspaceId/unarchive")
  async unarchiveWorkspace(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const data = await this.workspacesService.setWorkspaceArchivedStatus({
      actorUserId,
      workspaceId,
      status: "active",
    });

    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId: "nest-request",
    });
  }

  @Delete(":workspaceId")
  async deleteWorkspace(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const data = await this.workspacesService.deleteWorkspace({ actorUserId, workspaceId });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: data.message }),
      requestId: "nest-request",
    });
  }

  @Post(":workspaceId/transfer-ownership")
  async transferOwnership(
    @Param("workspaceId") workspaceId: string,
    @Headers("x-user-id") userIdHeader: unknown,
    @Body() body: TransferOwnershipBody,
  ) {
    const actorUserId = resolveRequestUserId(userIdHeader);
    const payload = this.validateTransferOwnership(body);
    const data = await this.workspacesService.transferOwnership({
      actorUserId,
      workspaceId,
      newOwnerUserId: payload.newOwnerUserId,
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

  private validateCreateWorkspace(body: CreateWorkspaceBody) {
    if (typeof body?.name !== "string") {
      throw new ValidationAppError({
        message: "Name is required.",
        issues: [{ field: "name", rule: "required", message: "Name is required." }],
      });
    }

    const name = body.name.trim();
    if (name.length < 3 || name.length > 60) {
      throw new ValidationAppError({
        message: "Name must be 3–60 characters.",
        issues: [{ field: "name", rule: "length", message: "Name must be 3–60 characters." }],
      });
    }

    if (typeof body?.type !== "string" || !validWorkspaceTypes.includes(body.type)) {
      throw new ValidationAppError({
        message: "Type is invalid.",
        issues: [{ field: "type", rule: "enum", message: "Type is invalid." }],
      });
    }

    const description =
      body.description === undefined ? undefined : (body.description ?? "").toString().trim();
    if (description !== undefined && description.length > 280) {
      throw new ValidationAppError({
        message: "Description is too long.",
        issues: [
          { field: "description", rule: "max_length", message: "Description is too long." },
        ],
      });
    }

    const icon = body.icon === undefined ? undefined : (body.icon ?? "").toString().trim();
    if (icon !== undefined && icon.length > 16) {
      throw new ValidationAppError({
        message: "Icon is too long.",
        issues: [{ field: "icon", rule: "max_length", message: "Icon is too long." }],
      });
    }

    const templateId =
      body.templateId === undefined ? undefined : (body.templateId ?? "").toString().trim();

    return {
      name,
      type: body.type,
      description: description === undefined ? undefined : description,
      icon: icon === undefined ? undefined : icon,
      templateId: templateId === undefined ? undefined : templateId || null,
    };
  }

  private validateUpdateWorkspace(body: UpdateWorkspaceBody) {
    if (!body || typeof body !== "object") {
      throw new ValidationAppError({
        message: "Payload is required.",
        issues: [{ field: "body", rule: "required", message: "Payload is required." }],
      });
    }

    const next: { name?: string; description?: string; icon?: string } = {};

    if (body.name !== undefined) {
      const name = (body.name ?? "").toString().trim();
      if (name.length < 3 || name.length > 60) {
        throw new ValidationAppError({
          message: "Name must be 3–60 characters.",
          issues: [{ field: "name", rule: "length", message: "Name must be 3–60 characters." }],
        });
      }
      next.name = name;
    }

    if (body.description !== undefined) {
      const description = (body.description ?? "").toString().trim();
      if (description.length > 280) {
        throw new ValidationAppError({
          message: "Description is too long.",
          issues: [
            { field: "description", rule: "max_length", message: "Description is too long." },
          ],
        });
      }
      next.description = description;
    }

    if (body.icon !== undefined) {
      const icon = (body.icon ?? "").toString().trim();
      if (icon.length > 16) {
        throw new ValidationAppError({
          message: "Icon is too long.",
          issues: [{ field: "icon", rule: "max_length", message: "Icon is too long." }],
        });
      }
      next.icon = icon;
    }

    return next;
  }

  private validateTransferOwnership(body: TransferOwnershipBody) {
    if (typeof body?.newOwnerUserId !== "string" || !body.newOwnerUserId.trim()) {
      throw new ValidationAppError({
        message: "newOwnerUserId is required.",
        issues: [
          {
            field: "newOwnerUserId",
            rule: "required",
            message: "newOwnerUserId is required.",
          },
        ],
      });
    }

    return { newOwnerUserId: body.newOwnerUserId.trim() };
  }
}
