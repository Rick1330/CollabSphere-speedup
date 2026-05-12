import { Body, Controller, Get, Inject, Param, Patch, Query } from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createListResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { NotificationsService } from "./notifications.service.js";

class ListNotificationsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @Transform(({ value }) => value === "true" || value === true)
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @IsString()
  category?: string;
}

class UpdatePreferencesBodyDto {
  @IsObject()
  inApp!: Record<string, boolean>;

  @IsObject()
  email!: Record<string, boolean>;

  @IsBoolean()
  dailyDigestEnabled!: boolean;

  @IsBoolean()
  weeklyDigestEnabled!: boolean;
}

const paginationMeta = (page: number, pageSize: number, totalItems: number) => ({
  page,
  pageSize,
  totalItems,
  totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  hasPreviousPage: page > 1,
  hasNextPage: page * pageSize < totalItems,
});

@Controller("notifications")
export class NotificationsNestController {
  constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @Get("unread-count")
  async unreadCount(@CurrentUserId() actorUserId: string, @ReqRequestId() requestId: string) {
    const resource = await this.notificationsService.getUnreadCount(actorUserId);
    return wrapSuccessResponse({ payload: createSingleResourcePayload(resource), requestId });
  }

  @Get()
  async list(
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    const result = await this.notificationsService.listNotifications({
      actorUserId,
      page: query.page,
      pageSize: query.pageSize,
      unreadOnly: query.unreadOnly,
      category: query.category,
    });
    return wrapSuccessResponse({
      payload: createListResponsePayload({
        items: result.items,
        total: result.total,
        pagination: {
          ...paginationMeta(Number(query.page), Number(query.pageSize), result.total),
        },
      }),
      requestId,
    });
  }

  @Patch(":notificationId/read")
  async markRead(
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Param("notificationId") notificationId: string,
  ) {
    const resource = await this.notificationsService.markRead(actorUserId, notificationId);
    return wrapSuccessResponse({ payload: createSingleResourcePayload({ notification: resource }), requestId });
  }

  @Patch("read-all")
  async markAllRead(@CurrentUserId() actorUserId: string, @ReqRequestId() requestId: string) {
    const result = await this.notificationsService.markAllRead(actorUserId);
    return wrapSuccessResponse({
      payload: createActionResponsePayload({
        message: "Notifications marked as read.",
        extraData: result,
      }),
      requestId,
    });
  }

  @Get("preferences")
  async getPreferences(@CurrentUserId() actorUserId: string, @ReqRequestId() requestId: string) {
    const pref = await this.notificationsService.getPreferences(actorUserId);
    return wrapSuccessResponse({ payload: createSingleResourcePayload(pref), requestId });
  }

  @Patch("preferences")
  async updatePreferences(
    @CurrentUserId() actorUserId: string,
    @ReqRequestId() requestId: string,
    @Body() body: UpdatePreferencesBodyDto,
  ) {
    const pref = await this.notificationsService.updatePreferences(actorUserId, body);
    return wrapSuccessResponse({ payload: createSingleResourcePayload(pref), requestId });
  }
}
