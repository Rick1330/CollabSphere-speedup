import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { AppError } from "../filters/app-error.filter.js";

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return true;
    }

    const cookieToken = request.cookies?.["csrf_token"];
    const headerToken = request.header("x-csrf-token");

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "CSRF validation failed.",
        statusCode: 403,
      });
    }

    return true;
  }
}
