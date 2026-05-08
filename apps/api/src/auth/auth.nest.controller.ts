import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Ip,
  Post,
} from "@nestjs/common";
import { AppError, createErrorResponse } from "../common/filters/app-error.filter.js";
import {
  createActionResponsePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { validateRegisterInput } from "./register.dto.js";
import { validateVerifyEmailInput } from "./verify-email.dto.js";
import { AuthAppService } from "./auth.app.service.js";
import { mapRegisterPersistenceError } from "./auth.service.js";

const mapToHttpException = (error: unknown) => {
  if (error instanceof AppError) {
    const mapped = createErrorResponse({
      error,
      requestId: "nest-request",
    });
    throw new HttpException(mapped.payload, mapped.statusCode);
  }
  const mapped = createErrorResponse({
    error,
    requestId: "nest-request",
  });
  throw new HttpException(mapped.payload, mapped.statusCode);
};

@Controller("auth")
export class AuthNestController {
  constructor(private readonly authAppService: AuthAppService) {}

  @Post("register")
  async register(
    @Body() rawBody: unknown,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgentHeader?: string,
  ) {
    try {
      const payload = validateRegisterInput(rawBody);
      const result = await this.authAppService.register({
        payload,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgentHeader ?? "unknown",
      });
      return {
        statusCode: HttpStatus.CREATED,
        ...wrapSuccessResponse({
          payload: createActionResponsePayload({
            message: result.message,
          }),
          requestId: "nest-request",
        }),
      };
    } catch (error) {
      mapToHttpException(mapRegisterPersistenceError(error));
    }
  }

  @Post("verify-email")
  async verifyEmail(
    @Body() rawBody: unknown,
    @Ip() ipAddress: string,
  ) {
    try {
      const payload = validateVerifyEmailInput(rawBody);
      const result = await this.authAppService.verifyEmail({
        payload,
        ipAddress: ipAddress || "unknown",
      });
      return {
        statusCode: HttpStatus.OK,
        ...wrapSuccessResponse({
          payload: createActionResponsePayload({
            message: result.message,
          }),
          requestId: "nest-request",
        }),
      };
    } catch (error) {
      mapToHttpException(error);
    }
  }
}
