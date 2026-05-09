import { randomBytes } from "node:crypto";
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Ip,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../common/decorators/public.decorator.js";
import { CurrentUserId } from "../common/decorators/current-user.decorator.js";
import { AppError, createErrorResponse } from "../common/filters/app-error.filter.js";
import { ReqRequestId } from "../common/nest/request-id.decorator.js";
import {
  createActionResponsePayload,
  wrapSuccessResponse,
} from "../common/interceptors/response-envelope.interceptor.js";
import { validateRegisterInput } from "./register.dto.js";
import { validateVerifyEmailInput } from "./verify-email.dto.js";
import { validateLoginInput } from "./login.dto.js";
import { validateForgotPasswordInput } from "./forgot-password.dto.js";
import { validateResetPasswordInput } from "./reset-password.dto.js";
import { validateResendVerificationInput } from "./resend-verification.dto.js";
import { AuthAppService } from "./auth.app.service.js";
import { AuthSessionService } from "./auth-session.service.js";
import { GoogleOAuthService } from "./google-oauth.service.js";
import { mapRegisterPersistenceError } from "./auth.service.js";
import { GOOGLE_OAUTH_STATE_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth-cookies.js";
import { clearRefreshTokenCookie, setRefreshTokenCookie } from "./auth-cookie.util.js";

const mapToHttpException = (error: unknown, requestId: string) => {
  if (error instanceof AppError) {
    const mapped = createErrorResponse({
      error,
      requestId,
    });
    throw new HttpException(mapped.payload, mapped.statusCode);
  }
  const mapped = createErrorResponse({
    error,
    requestId,
  });
  throw new HttpException(mapped.payload, mapped.statusCode);
};

@Controller("auth")
export class AuthNestController {
  constructor(
    @Inject(AuthAppService) private readonly authAppService: AuthAppService,
    @Inject(AuthSessionService) private readonly authSession: AuthSessionService,
    @Inject(GoogleOAuthService) private readonly googleOAuth: GoogleOAuthService,
  ) {}

  @Public()
  @Post("register")
  async register(
    @ReqRequestId() requestId: string,
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
          requestId,
        }),
      };
    } catch (error) {
      mapToHttpException(mapRegisterPersistenceError(error), requestId);
    }
  }

  @Public()
  @Post("verify-email")
  async verifyEmail(
    @ReqRequestId() requestId: string,
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
          requestId,
        }),
      };
    } catch (error) {
      mapToHttpException(error, requestId);
    }
  }

  @Public()
  @Post("login")
  async login(
    @ReqRequestId() requestId: string,
    @Body() rawBody: unknown,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgentHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const payload = validateLoginInput(rawBody);
      const session = await this.authSession.login({
        email: payload.email,
        password: payload.password,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgentHeader ?? "unknown",
      });
      setRefreshTokenCookie(res, session.refreshToken);
      return wrapSuccessResponse({
        payload: createActionResponsePayload({
          message: "Signed in successfully.",
          extraData: {
            accessToken: session.accessToken,
            user: session.user,
          },
        }),
        requestId,
      });
    } catch (error) {
      mapToHttpException(error, requestId);
    }
  }

  @Public()
  @Post("refresh")
  async refresh(
    @ReqRequestId() requestId: string,
    @Req() req: Request,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgentHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const raw = req.cookies?.[REFRESH_TOKEN_COOKIE];
      const session = await this.authSession.refreshSession({
        refreshToken: raw,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgentHeader ?? "unknown",
      });
      setRefreshTokenCookie(res, session.refreshToken);
      return wrapSuccessResponse({
        payload: createActionResponsePayload({
          message: "Session refreshed.",
          extraData: {
            accessToken: session.accessToken,
          },
        }),
        requestId,
      });
    } catch (error) {
      mapToHttpException(error, requestId);
    }
  }

  @Public()
  @Post("logout")
  async logout(
    @ReqRequestId() requestId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[REFRESH_TOKEN_COOKIE];
    await this.authSession.logout(raw);
    clearRefreshTokenCookie(res);
    return wrapSuccessResponse({
      payload: createActionResponsePayload({
        message: "Signed out successfully.",
      }),
      requestId,
    });
  }

  @Post("logout-all")
  async logoutAll(@ReqRequestId() requestId: string, @CurrentUserId() userId: string) {
    await this.authSession.logoutAll(userId);
    return wrapSuccessResponse({
      payload: createActionResponsePayload({
        message: "All sessions have been revoked.",
      }),
      requestId,
    });
  }

  @Public()
  @Post("resend-verification")
  async resendVerification(
    @ReqRequestId() requestId: string,
    @Body() rawBody: unknown,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgentHeader: string | undefined,
  ) {
    try {
      const payload = validateResendVerificationInput(rawBody);
      const result = await this.authSession.resendVerification({
        email: payload.email,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgentHeader ?? "unknown",
      });
      return wrapSuccessResponse({
        payload: createActionResponsePayload({
          message: result.message,
        }),
        requestId,
      });
    } catch (error) {
      mapToHttpException(error, requestId);
    }
  }

  @Public()
  @Post("forgot-password")
  async forgotPassword(@ReqRequestId() requestId: string, @Body() rawBody: unknown) {
    try {
      const payload = validateForgotPasswordInput(rawBody);
      const result = await this.authSession.requestPasswordReset({ email: payload.email });
      return wrapSuccessResponse({
        payload: createActionResponsePayload({
          message: result.message,
        }),
        requestId,
      });
    } catch (error) {
      mapToHttpException(error, requestId);
    }
  }

  @Public()
  @Post("reset-password")
  async resetPassword(@ReqRequestId() requestId: string, @Body() rawBody: unknown) {
    try {
      const payload = validateResetPasswordInput(rawBody);
      const result = await this.authSession.resetPassword({
        token: payload.token,
        password: payload.password,
      });
      return wrapSuccessResponse({
        payload: createActionResponsePayload({
          message: result.message,
        }),
        requestId,
      });
    } catch (error) {
      mapToHttpException(error, requestId);
    }
  }

  @Post("collab-token")
  async issueCollabToken(
    @ReqRequestId() requestId: string,
    @CurrentUserId() userId: string,
    @Body() body: { workspaceId?: string; documentId?: string },
  ) {
    try {
      const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId.trim() : "";
      const documentId = typeof body?.documentId === "string" ? body.documentId.trim() : "";
      if (!workspaceId || !documentId) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "workspaceId and documentId are required.",
        });
      }
      const result = await this.authSession.issueCollabToken({ userId, workspaceId, documentId });
      return wrapSuccessResponse({
        payload: createActionResponsePayload({
          message: "Collaboration token issued.",
          extraData: result,
        }),
        requestId,
      });
    } catch (error) {
      mapToHttpException(error, requestId);
    }
  }

  @Public()
  @Get("google")
  startGoogle(@ReqRequestId() requestId: string, @Res() res: Response) {
    if (!this.googleOAuth.isConfigured()) {
      const mapped = createErrorResponse({
        error: new AppError({
          code: "SERVICE_UNAVAILABLE",
          message: "Google OAuth is not configured",
        }),
        requestId,
      });
      res.status(mapped.statusCode).json(mapped.payload);
      return;
    }
    const state = randomBytes(16).toString("hex");
    res.cookie(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000,
      path: "/",
    });
    const url = this.googleOAuth.buildAuthorizationUrl(state);
    res.status(HttpStatus.FOUND).redirect(url);
  }

  @Public()
  @Get("google/callback")
  async googleCallback(
    @ReqRequestId() requestId: string,
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() req: Request,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgentHeader: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const expected = req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE];
      res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
      if (!code || !state || !expected || state !== expected) {
        throw new AppError({
          code: "OAUTH_STATE_MISMATCH",
          message: "OAuth state validation failed",
        });
      }
      const profile = await this.googleOAuth.exchangeCodeForProfile(code);
      const session = await this.authSession.completeGoogleOAuth({
        googleSub: profile.sub,
        email: profile.email,
        fullName: profile.fullName,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgentHeader ?? "unknown",
      });
      setRefreshTokenCookie(res, session.refreshToken);
      return wrapSuccessResponse({
        payload: createActionResponsePayload({
          message: "Signed in with Google.",
          extraData: {
            accessToken: session.accessToken,
            user: session.user,
          },
        }),
        requestId,
      });
    } catch (error) {
      mapToHttpException(error, requestId);
    }
  }
}
