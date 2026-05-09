import { Body, Controller, Get, Inject, Put } from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { UsersService } from "./users.service.js";

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
    @Body()
    body: {
      fullName?: string;
      bio?: string | null;
      themePreference?: string;
      avatarUrl?: string | null;
    },
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
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    const result = await this.usersService.changePassword(userId, { currentPassword, newPassword });
    return wrapSuccessResponse({
      payload: createActionResponsePayload({ message: result.message }),
      requestId,
    });
  }
}
