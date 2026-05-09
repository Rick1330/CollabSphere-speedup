import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export type RequestUser = {
  sub: string;
  email: string;
  globalRole: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const id = request.user?.sub;
  if (!id) {
    throw new Error("CurrentUserId used without authenticated user");
  }
  return id;
});
