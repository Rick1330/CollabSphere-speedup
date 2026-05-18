import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { GLOBAL_ROLE_KEY } from "../decorators/global-role.decorator.js";
import { AppError } from "../filters/app-error.filter.js";
import { PrismaClientProvider } from "../prisma/prisma-client.provider.js";

@Injectable()
export class GlobalRolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<string | undefined>(GLOBAL_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.sub;
    if (!userId) {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Missing authentication context.",
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { globalRole: true },
    });

    if (requiredRole === "ADMIN" && user?.globalRole !== "ADMIN") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "This action requires elevated permissions.",
      });
    }

    return true;
  }
}
