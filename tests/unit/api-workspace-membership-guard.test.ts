import assert from "node:assert/strict";
import test from "node:test";
import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { AppError } from "../../apps/api/src/common/filters/app-error.filter.js";
import { WorkspaceMembershipGuard } from "../../apps/api/src/common/guards/workspace-membership.guard.js";
import { WORKSPACE_ROLE_KEY } from "../../apps/api/src/common/decorators/workspace-role.decorator.js";

const WORKSPACE_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "660e8400-e29b-41d4-a716-446655440001";

const createContext = (request: Partial<Request>, handlerRole?: string): ExecutionContext => {
  const handler = handlerRole ? { [WORKSPACE_ROLE_KEY]: handlerRole } : {};
  return {
    switchToHttp: () => ({
      getRequest: () => request as Request,
    }),
    getHandler: () => handler,
    getClass: () => ({}),
  } as ExecutionContext;
};

const createGuard = (prisma: {
  workspace: { findFirst: (args: unknown) => Promise<unknown> };
  workspaceMember: { findFirst: (args: unknown) => Promise<unknown> };
  user: { findFirst: (args: unknown) => Promise<unknown> };
}) => {
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
  return new WorkspaceMembershipGuard(reflector as never, prisma as never);
};

test("WorkspaceMembershipGuard passes when workspaceId param is absent", async () => {
  const guard = createGuard({
    workspace: { findFirst: async () => assert.fail("should not query workspace") },
    workspaceMember: { findFirst: async () => assert.fail("should not query member") },
    user: { findFirst: async () => assert.fail("should not query user") },
  });
  const ok = await guard.canActivate(
    createContext({ method: "GET", params: {}, user: { sub: USER_ID, email: "a@b.c", globalRole: "MEMBER" } }),
  );
  assert.equal(ok, true);
});

test("WorkspaceMembershipGuard throws WORKSPACE_NOT_FOUND when workspace is missing", async () => {
  const guard = createGuard({
    workspace: { findFirst: async () => null },
    workspaceMember: { findFirst: async () => assert.fail("member lookup should not run") },
    user: { findFirst: async () => assert.fail("user lookup should not run") },
  });
  await assert.rejects(
    () =>
      guard.canActivate(
        createContext({
          method: "GET",
          params: { workspaceId: WORKSPACE_ID },
          user: { sub: USER_ID, email: "a@b.c", globalRole: "MEMBER" },
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "WORKSPACE_NOT_FOUND");
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test("WorkspaceMembershipGuard throws WORKSPACE_ARCHIVED_READONLY on write before membership lookup", async () => {
  let memberQueried = false;
  const guard = createGuard({
    workspace: {
      findFirst: async () => ({ id: WORKSPACE_ID, status: "archived" }),
    },
    workspaceMember: {
      findFirst: async () => {
        memberQueried = true;
        return null;
      },
    },
    user: { findFirst: async () => null },
  });
  await assert.rejects(
    () =>
      guard.canActivate(
        createContext({
          method: "PUT",
          params: { workspaceId: WORKSPACE_ID },
          user: { sub: USER_ID, email: "a@b.c", globalRole: "MEMBER" },
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "WORKSPACE_ARCHIVED_READONLY");
      assert.equal(error.statusCode, 403);
      return true;
    },
  );
  assert.equal(memberQueried, false);
});

test("WorkspaceMembershipGuard throws NOT_WORKSPACE_MEMBER for non-member", async () => {
  const guard = createGuard({
    workspace: {
      findFirst: async () => ({ id: WORKSPACE_ID, status: "active" }),
    },
    workspaceMember: { findFirst: async () => null },
    user: { findFirst: async () => ({ globalRole: "MEMBER" }) },
  });
  await assert.rejects(
    () =>
      guard.canActivate(
        createContext({
          method: "GET",
          params: { workspaceId: WORKSPACE_ID },
          user: { sub: USER_ID, email: "a@b.c", globalRole: "MEMBER" },
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "NOT_WORKSPACE_MEMBER");
      return true;
    },
  );
});

test("WorkspaceMembershipGuard throws INSUFFICIENT_ROLE when role is below required", async () => {
  const guard = createGuard({
    workspace: {
      findFirst: async () => ({ id: WORKSPACE_ID, status: "active" }),
    },
    workspaceMember: {
      findFirst: async () => ({
        id: "770e8400-e29b-41d4-a716-446655440002",
        role: "VIEWER",
        workspaceId: WORKSPACE_ID,
        user: { fullName: "Test User" },
      }),
    },
    user: { findFirst: async () => assert.fail("user lookup should not run") },
  });
  await assert.rejects(
    () =>
      guard.canActivate(
        createContext(
          {
            method: "GET",
            params: { workspaceId: WORKSPACE_ID },
            user: { sub: USER_ID, email: "a@b.c", globalRole: "MEMBER" },
          },
          "MEMBER",
        ),
      ),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "INSUFFICIENT_ROLE");
      return true;
    },
  );
});

test("WorkspaceMembershipGuard attaches workspace and member with fullName", async () => {
  const request: Partial<Request> = {
    method: "GET",
    params: { workspaceId: WORKSPACE_ID },
    user: { sub: USER_ID, email: "a@b.c", globalRole: "MEMBER" },
  };
  const guard = createGuard({
    workspace: {
      findFirst: async () => ({ id: WORKSPACE_ID, status: "active" }),
    },
    workspaceMember: {
      findFirst: async () => ({
        id: "770e8400-e29b-41d4-a716-446655440002",
        role: "MEMBER",
        workspaceId: WORKSPACE_ID,
        user: { fullName: "Test User" },
      }),
    },
    user: { findFirst: async () => assert.fail("user lookup should not run") },
  });
  const ok = await guard.canActivate(createContext(request));
  assert.equal(ok, true);
  assert.deepEqual(request.workspace, { id: WORKSPACE_ID, status: "active" });
  assert.equal(request.workspaceMember?.role, "MEMBER");
  assert.equal(request.workspaceMember?.user?.fullName, "Test User");
});

test("WorkspaceMembershipGuard allows platform admin GET bypass from DB globalRole", async () => {
  const request: Partial<Request> = {
    method: "GET",
    params: { workspaceId: WORKSPACE_ID },
    user: { sub: USER_ID, email: "admin@b.c", globalRole: "MEMBER" },
  };
  const guard = createGuard({
    workspace: {
      findFirst: async () => ({ id: WORKSPACE_ID, status: "active" }),
    },
    workspaceMember: { findFirst: async () => null },
    user: { findFirst: async () => ({ globalRole: "ADMIN" }) },
  });
  const ok = await guard.canActivate(createContext(request));
  assert.equal(ok, true);
  assert.equal(request.workspaceMember?.role, "VIEWER");
  assert.equal(request.workspace?.id, WORKSPACE_ID);
});
