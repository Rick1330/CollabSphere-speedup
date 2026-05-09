import assert from "node:assert/strict";
import test from "node:test";
import "../integration/nest-api-http-env.setup.ts";
import { ActivityNestController } from "../../apps/api/src/activity/activity.nest.controller.js";
import { SearchNestController } from "../../apps/api/src/search/search.nest.controller.js";
import { AdminNestController } from "../../apps/api/src/admin/admin.nest.controller.js";
import type { ActivityService } from "../../apps/api/src/activity/activity.service.js";
import type { SearchService } from "../../apps/api/src/search/search.service.js";
import type { AdminService } from "../../apps/api/src/admin/admin.service.js";

test("ActivityNestController wraps list response", async () => {
  const service: Pick<ActivityService, "listWorkspaceActivity"> = {
    listWorkspaceActivity: async () => ({ items: [{ id: "a-1" }], total: 1 }),
  };
  const controller = new ActivityNestController(service as ActivityService);
  const result = await controller.list("ws-1", "u-1", "req-1", { page: 1, pageSize: 20 });
  assert.equal(result.data.total, 1);
  assert.equal(Array.isArray(result.data.items), true);
});

test("SearchNestController wraps search resources", async () => {
  const service: Pick<SearchService, "searchWorkspace"> = {
    searchWorkspace: async () => ({ documents: [{ id: "d-1" }], tasks: [{ id: "t-1" }] }),
  };
  const controller = new SearchNestController(service as SearchService);
  const result = await controller.search("ws-1", "u-1", "req-1", { q: "api", limit: 10 });
  assert.equal(Array.isArray(result.data.resource.documents), true);
  assert.equal(Array.isArray(result.data.resource.tasks), true);
});

test("AdminNestController wraps overview and user listing", async () => {
  const service: Pick<
    AdminService,
    | "overview"
    | "listUsers"
    | "setUserActive"
    | "setUserRole"
    | "listWorkspaces"
    | "setWorkspaceArchived"
    | "forceDeleteWorkspace"
    | "listAudit"
    | "getUser"
  > = {
    overview: async () => ({ totalUsers: 10 }),
    listUsers: async () => ({ items: [{ id: "u-1" }], total: 1 }),
    setUserActive: async () => ({ id: "u-1", isActive: false }) as never,
    setUserRole: async () => ({ id: "u-1", globalRole: "ADMIN" }) as never,
    listWorkspaces: async () => ({ items: [{ id: "w-1" }], total: 1 }),
    setWorkspaceArchived: async () => ({ id: "w-1", status: "archived" }) as never,
    forceDeleteWorkspace: async () => ({ id: "w-1" }) as never,
    listAudit: async () => ({ items: [{ id: "log-1" }], total: 1 }),
    getUser: async () => ({ id: "u-1" }) as never,
  };
  const controller = new AdminNestController(service as AdminService);
  const overview = await controller.overview("req-1");
  assert.equal(overview.data.resource.totalUsers, 10);
  const users = await controller.users("req-2", { page: 1, pageSize: 20 });
  assert.equal(users.data.total, 1);
});
