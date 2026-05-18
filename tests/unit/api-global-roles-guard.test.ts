import assert from "node:assert/strict";
import test from "node:test";
import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import { GlobalRolesGuard } from "../../apps/api/src/common/guards/global-roles.guard.js";
import { GLOBAL_ROLE_KEY } from "../../apps/api/src/common/decorators/global-role.decorator.js";

const USER_ID = "660e8400-e29b-41d4-a716-446655440001";

const createContext = (request: Partial<Request>, requiredRole?: string): ExecutionContext => {
  const handler = requiredRole ? { [GLOBAL_ROLE_KEY]: requiredRole } : {};
  return {
    switchToHttp: () => ({
      getRequest: () => request as Request,
    }),
    getHandler: () => handler,
    getClass: () => ({}),
  } as ExecutionContext;
};

const createGuard = (globalRole: string | null) => {
  const reflector = {
    getAllAndOverride: <T>(key: string, targets: unknown[]): T | undefined => {
      for (const target of targets) {
        if (target && typeof target === "object" && key in target) {
          return (target as Record<string, T>)[key];
        }
      }
      return undefined;
    },
  };
  const prisma = {
    user: {
      findFirst: async () => (globalRole === null ? null : { globalRole }),
    },
  };
  return new GlobalRolesGuard(reflector as never, prisma as never);
};

test("GlobalRolesGuard passes when globalRole metadata is absent", async () => {
  const guard = createGuard("MEMBER");
  const ok = await guard.canActivate(
    createContext({ user: { sub: USER_ID, email: "a@b.c", globalRole: "MEMBER" } }),
  );
  assert.equal(ok, true);
});

test("GlobalRolesGuard throws FORBIDDEN when DB globalRole is not ADMIN", async () => {
  const guard = createGuard("MEMBER");
  await assert.rejects(
    () =>
      guard.canActivate(
        createContext(
          { user: { sub: USER_ID, email: "a@b.c", globalRole: "ADMIN" } },
          "ADMIN",
        ),
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "FORBIDDEN");
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
});

test("GlobalRolesGuard allows when DB globalRole is ADMIN", async () => {
  const guard = createGuard("ADMIN");
  const ok = await guard.canActivate(
    createContext(
      { user: { sub: USER_ID, email: "a@b.c", globalRole: "MEMBER" } },
      "ADMIN",
    ),
  );
  assert.equal(ok, true);
});
