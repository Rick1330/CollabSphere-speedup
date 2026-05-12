import { Controller, Get, Headers, Inject, Ip, Param, Patch, Query } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AdminOnly } from "../common/decorators/admin-only.decorator.js";
import { CurrentUser, type RequestUser } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { AdminService } from "./admin.service.js";

class PagingQueryDto {
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page = 1;

  @Transform(({ value }) => Number(value ?? 20))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  q?: string;
}

class AuditQueryDto extends PagingQueryDto {
  @IsOptional()
  @IsIn(["info", "warn", "error"])
  severity?: string;
}

const paginationMeta = (page: number, pageSize: number, totalItems: number) => ({
  page,
  pageSize,
  totalItems,
  totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  hasPreviousPage: page > 1,
  hasNextPage: page * pageSize < totalItems,
});

@AdminOnly()
@Controller("admin")
export class AdminNestController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get("overview")
  async overview(@ReqRequestId() requestId: string) {
    const resource = await this.adminService.overview();
    return wrapSuccessResponse({ payload: createSingleResourcePayload(resource), requestId });
  }

  @Get("users")
  async users(@ReqRequestId() requestId: string, @Query() query: PagingQueryDto) {
    const result = await this.adminService.listUsers(query.page, query.pageSize, query.q);
    return wrapSuccessResponse({
      payload: createListResponsePayload({
        items: result.items,
        total: result.total,
        pagination: {
          ...paginationMeta(query.page, query.pageSize, result.total),
        },
      }),
      requestId,
    });
  }

  @Get("users/:userId")
  async userDetail(@ReqRequestId() requestId: string, @Param("userId") userId: string) {
    const user = await this.adminService.getUser(userId);
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(user),
      requestId,
    });
  }

  @Patch("users/:userId/deactivate")
  async deactivate(
    @ReqRequestId() requestId: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: RequestUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    await this.adminService.setUserActive(userId, false, {
      id: actor.sub,
      email: actor.email,
      globalRole: actor.globalRole,
      ipAddress,
      userAgent,
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: "User deactivated." }),
      requestId,
    });
  }

  @Patch("users/:userId/reactivate")
  async reactivate(
    @ReqRequestId() requestId: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: RequestUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    await this.adminService.setUserActive(userId, true, {
      id: actor.sub,
      email: actor.email,
      globalRole: actor.globalRole,
      ipAddress,
      userAgent,
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: "User reactivated." }),
      requestId,
    });
  }

  @Patch("users/:userId/promote")
  async promote(
    @ReqRequestId() requestId: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: RequestUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    await this.adminService.setUserRole(userId, "ADMIN", {
      id: actor.sub,
      email: actor.email,
      globalRole: actor.globalRole,
      ipAddress,
      userAgent,
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: "User promoted." }),
      requestId,
    });
  }

  @Patch("users/:userId/demote")
  async demote(
    @ReqRequestId() requestId: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: RequestUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    await this.adminService.setUserRole(userId, "USER", {
      id: actor.sub,
      email: actor.email,
      globalRole: actor.globalRole,
      ipAddress,
      userAgent,
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: "User demoted." }),
      requestId,
    });
  }

  @Get("workspaces")
  async workspaces(@ReqRequestId() requestId: string, @Query() query: PagingQueryDto) {
    const result = await this.adminService.listWorkspaces(query.page, query.pageSize, query.q);
    return wrapSuccessResponse({
      payload: createListResponsePayload({
        items: result.items,
        total: result.total,
        pagination: {
          ...paginationMeta(query.page, query.pageSize, result.total),
        },
      }),
      requestId,
    });
  }

  @Patch("workspaces/:workspaceId/archive")
  async archive(
    @ReqRequestId() requestId: string,
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() actor: RequestUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    await this.adminService.setWorkspaceArchived(workspaceId, true, {
      id: actor.sub,
      email: actor.email,
      globalRole: actor.globalRole,
      ipAddress,
      userAgent,
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: "Workspace archived." }),
      requestId,
    });
  }

  @Patch("workspaces/:workspaceId/unarchive")
  async unarchive(
    @ReqRequestId() requestId: string,
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() actor: RequestUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    await this.adminService.setWorkspaceArchived(workspaceId, false, {
      id: actor.sub,
      email: actor.email,
      globalRole: actor.globalRole,
      ipAddress,
      userAgent,
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: "Workspace unarchived." }),
      requestId,
    });
  }

  @Patch("workspaces/:workspaceId/force-delete")
  async forceDelete(
    @ReqRequestId() requestId: string,
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() actor: RequestUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    await this.adminService.forceDeleteWorkspace(workspaceId, {
      id: actor.sub,
      email: actor.email,
      globalRole: actor.globalRole,
      ipAddress,
      userAgent,
    });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: "Workspace deleted." }),
      requestId,
    });
  }

  @Get("audit")
  async audit(
    @ReqRequestId() requestId: string,
    @Query() query: AuditQueryDto,
    @CurrentUser() actor: RequestUser,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string | undefined,
  ) {
    const result = await this.adminService.listAudit(query.page, query.pageSize, query.severity, query.q, {
      id: actor.sub,
      email: actor.email,
      globalRole: actor.globalRole,
      ipAddress,
      userAgent,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({
        items: result.items,
        total: result.total,
        pagination: {
          ...paginationMeta(query.page, query.pageSize, result.total),
        },
      }),
      requestId,
    });
  }
}
