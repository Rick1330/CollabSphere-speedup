import { Body, Controller, Get, Inject, Put } from "@nestjs/common";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  createSingleResourcePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { UsersService } from "./users.service.js";
import { ChangePasswordDto, UpdateMeDto } from "./users.dto.js";

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
}
