import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { GlobalRole } from "@prisma/client";
import { AppError } from "../filters/app-error.filter.js";
import { ROLES_KEY } from "../decorators/roles.decorator.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<GlobalRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const role = request.user?.globalRole as GlobalRole | undefined;
    if (!role || !required.includes(role)) {
      throw new AppError({
        code: "ADMIN_ONLY",
        message: "This action requires elevated permissions.",
      });
    }
    return true;
  }
}
