import assert from "node:assert/strict";
import test from "node:test";
import "../integration/nest-api-http-env.setup.ts";
import { NotificationsNestController } from "../../apps/api/src/notifications/notifications.nest.controller.js";
import type { NotificationsService } from "../../apps/api/src/notifications/notifications.service.js";

const createController = () => {
  const service: Pick<
    NotificationsService,
    "getUnreadCount" | "listNotifications" | "markRead" | "markAllRead" | "getPreferences" | "updatePreferences"
  > = {
    getUnreadCount: async () => ({ unreadCount: 2 }),
    listNotifications: async () => ({
      items: [{ id: "n-1", type: "task.assigned", isRead: false }],
      total: 1,
    }),
    markRead: async () => ({ id: "n-1", isRead: true }) as never,
    markAllRead: async () => ({ updatedCount: 2 }),
    getPreferences: async () =>
      ({ inApp: { "task.assigned": true }, email: {}, dailyDigestEnabled: false, weeklyDigestEnabled: true }) as never,
    updatePreferences: async (_actor, input) => input as never,
  };
  return new NotificationsNestController(service as NotificationsService);
};

test("NotificationsNestController lists notifications and unread count", async () => {
  const controller = createController();
  const unread = await controller.unreadCount("u-1", "req-1");
  assert.equal(unread.data.resource.unreadCount, 2);
  const listed = await controller.list("u-1", "req-2", { page: 1, pageSize: 20 } as never);
  assert.equal(Array.isArray(listed.data.items), true);
  assert.equal(listed.data.total, 1);
});

test("NotificationsNestController wraps mutations and preferences", async () => {
  const controller = createController();
  const marked = await controller.markRead("u-1", "req-1", "n-1");
  assert.equal(marked.data.resource.notification.isRead, true);
  const markAll = await controller.markAllRead("u-1", "req-2");
  assert.equal(markAll.data.updatedCount, 2);
  const pref = await controller.getPreferences("u-1", "req-3");
  assert.equal(pref.data.resource.weeklyDigestEnabled, true);
});
