import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import { AppError } from "../filters/app-error.filter.js";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    /** Unauthenticated bootstrap routes (login, register, …) cannot satisfy double-submit CSRF yet. */
    if (isPublic) {
      return true;
    }

    const cookieToken = request.cookies?.["csrf_token"];
    const headerToken = request.header("x-csrf-token");

    const tokensMatch =
      typeof cookieToken === "string" &&
      typeof headerToken === "string" &&
      cookieToken.length > 0 &&
      cookieToken === headerToken;

    if (tokensMatch) {
      return true;
    }

    /**
     * Local dev often calls the API on `http://127.0.0.1:3001` from a Vite app on
     * `http://localhost:8080`. `SameSite=Lax` cookies set on 127.0.0.1 are not sent on
     * those cross-site fetches, so double-submit CSRF cannot see `csrf_token` even though
     * the client still sends `X-CSRF-Token` from the login payload (localStorage).
     * Allow header-only CSRF in non-production when the user is already JWT-authenticated.
     */
    const isNonProd = (process.env.NODE_ENV ?? "development") !== "production";
    const hasBearerSession =
      typeof request.user?.sub === "string" &&
      request.user.sub.length > 0 &&
      typeof headerToken === "string" &&
      headerToken.length >= 16;

    if (isNonProd && hasBearerSession) {
      return true;
    }

    throw new AppError({
      code: "FORBIDDEN",
      message: "CSRF validation failed.",
      statusCode: 403,
    });
  }
}
