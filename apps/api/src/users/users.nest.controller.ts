import { Body, Controller, Get, Inject, Patch, Put } from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { UsersService } from "./users.service.js";
import { ChangePasswordDto, UpdateMeDto } from "./users.dto.js";
import { UpdateEditorPreferencesDto } from "./users-editor-preferences.dto.js";

@Controller("users")
export class UsersNestController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get("me")
  async getMe(@ReqRequestId() requestId: string, @CurrentUserId() userId: string) {
    const data = await this.usersService.getMe(userId);
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Put("me")
  async updateMe(
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
    @Body() body: UpdateMeDto,
  ) {
    const data = await this.usersService.updateMe(userId, body);
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Put("me/password")
  async changePassword(
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
    @Body() body: ChangePasswordDto,
  ) {
    const result = await this.usersService.changePassword(userId, body);
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: result.message }),
      requestId,
    });
  }

  @Put("me/avatar")
  async updateAvatar(
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
    @Body() body: { avatarUrl: string | null },
  ) {
    const data = await this.usersService.updateMe(userId, { avatarUrl: body.avatarUrl });
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Get("me/editor-preferences")
  async getEditorPreferences(@ReqRequestId() requestId: string, @CurrentUserId() userId: string) {
    const data = await this.usersService.getEditorPreferences(userId);
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }

  @Patch("me/editor-preferences")
  async updateEditorPreferences(
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
    @Body() body: UpdateEditorPreferencesDto,
  ) {
    const data = await this.usersService.updateEditorPreferences(userId, body);
    return wrapSuccessResponse({
      payload: createSingleResourcePayload(data),
      requestId,
    });
  }
}
