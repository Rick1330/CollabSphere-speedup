import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ADMIN_ONLY_KEY } from "../decorators/admin-only.decorator.js";
import { AppError } from "../filters/app-error.filter.js";

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const adminOnly =
      this.reflector?.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [context.getHandler(), context.getClass()]) ??
      Reflect.getMetadata(ADMIN_ONLY_KEY, context.getHandler()) ??
      Reflect.getMetadata(ADMIN_ONLY_KEY, context.getClass());
    if (!adminOnly) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const role = request.user?.globalRole;
    if (role !== "ADMIN") {
      throw new AppError({ code: "ADMIN_ONLY" });
    }
    return true;
  }
}
