import { Inject, type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import type { RequestUser } from "../decorators/current-user.decorator.js";
import { JwtAccessService } from "../../auth/jwt-access.service.js";
import { isValidUuid } from "../auth/request-user.js";
import { AppError } from "../filters/app-error.filter.js";

const legacyHeaderEnv = () => process.env.ALLOW_LEGACY_X_USER_ID === "1";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtAccessService) private readonly jwtAccess: JwtAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === "OPTIONS") {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    if (legacyHeaderEnv()) {
      const legacy = request.headers["x-user-id"];
      const raw = Array.isArray(legacy) ? legacy[0] : legacy;
      if (typeof raw === "string" && isValidUuid(raw.trim())) {
        request.user = {
          sub: raw.trim(),
          email: "",
          globalRole: "USER",
        };
        return true;
      }
    }

    const authHeader = request.headers.authorization;
    const bearer =
      typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : "";

    if (!bearer) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Missing or invalid Authorization header",
      });
    }

    try {
      const payload = await this.jwtAccess.verifyAccessToken(bearer);
      request.user = payload as RequestUser;
      return true;
    } catch {
      throw new AppError({
        code: "TOKEN_INVALID",
        message: "Access token is invalid or expired",
      });
    }
  }
}
