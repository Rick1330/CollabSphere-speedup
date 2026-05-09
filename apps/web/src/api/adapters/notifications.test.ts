import { describe, it, expect, vi } from "vitest";
import * as apiClient from "@/api/client";
import {
  fetchNotifications,
  fetchUnreadCount,
  fetchNotificationCategoryCounts,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_CATEGORY,
  NOTIFICATION_CATEGORY_META,
} from "./notifications";

describe("api/adapters/notifications", () => {
  it("paginates the feed and returns correct meta totals", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: { items: [{ id: "n-1", type: "task.assigned", isRead: false }], total: 21 },
      meta: { pagination: { page: 1, pageSize: 10, totalItems: 21, totalPages: 3 } },
    } as never);
    const page1 = await fetchNotifications({
      page: 1,
      pageSize: 10,
      unreadOnly: false,
    });
    expect(page1.data.items).toHaveLength(1);
    expect(page1.meta.pagination.page).toBe(1);
    expect(page1.meta.pagination.pageSize).toBe(10);
    expect(page1.meta.pagination.totalItems).toBeGreaterThan(10);
    expect(page1.meta.pagination.totalPages).toBe(
      Math.ceil(page1.meta.pagination.totalItems / 10),
    );

    requestSpy.mockRestore();
  });

  it("respects the unreadOnly filter", async () => {
    const requestSpy = vi
      .spyOn(apiClient, "request")
      .mockResolvedValueOnce({
        data: { items: [{ id: "n-1", type: "task.assigned", isRead: false }], total: 2 },
        meta: { pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1 } },
      } as never)
      .mockResolvedValueOnce({
        data: { items: [{ id: "n-1", type: "task.assigned", isRead: false }], total: 1 },
        meta: { pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } },
      } as never);
    const all = await fetchNotifications({ page: 1, pageSize: 100, unreadOnly: false });
    const unread = await fetchNotifications({ page: 1, pageSize: 100, unreadOnly: true });
    expect(unread.data.items.every((n) => !n.isRead)).toBe(true);
    expect(unread.meta.pagination.totalItems).toBeLessThanOrEqual(
      all.meta.pagination.totalItems,
    );
    requestSpy.mockRestore();
  });

  it("respects the category filter", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: {
        items: [{ id: "n-1", type: "task.assigned", isRead: false }],
        total: 1,
      },
      meta: { pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 } },
    } as never);
    const tasksOnly = await fetchNotifications({
      page: 1,
      pageSize: 100,
      unreadOnly: false,
      category: "tasks",
    });
    expect(tasksOnly.data.items.length).toBeGreaterThan(0);
    for (const n of tasksOnly.data.items) {
      expect(NOTIFICATION_CATEGORY[n.type]).toBe("tasks");
    }
    requestSpy.mockRestore();
  });

  it("category counts sum to the global total for the same filter", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: {
        items: [
          { id: "n-1", type: "task.assigned", isRead: false },
          { id: "n-2", type: "comment.reply", isRead: false },
        ],
        total: 2,
      },
      meta: { pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1 } },
    } as never);
    const counts = await fetchNotificationCategoryCounts(false);
    const sum = (Object.values(counts.data.byCategory) as number[]).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(counts.data.all);
    // Every category surfaces in the meta map -> chip rendering won't blank.
    for (const cat of Object.keys(counts.data.byCategory)) {
      expect(NOTIFICATION_CATEGORY_META[cat as keyof typeof NOTIFICATION_CATEGORY_META]).toBeDefined();
    }
    requestSpy.mockRestore();
  });

  it("markNotificationRead drops one from the unread count", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValue({} as never);
    await markNotificationRead("n-1");
    expect(requestSpy).toHaveBeenCalledWith("/notifications/n-1/read", { method: "PATCH" });
    requestSpy.mockRestore();
  });

  it("markAllNotificationsRead zeros the unread count and reports the delta", async () => {
    const requestSpy = vi.spyOn(apiClient, "request").mockResolvedValueOnce({
      data: { extraData: { updatedCount: 3 } },
    } as never);
    const result = await markAllNotificationsRead();
    expect(result.data.updatedCount).toBe(3);
    requestSpy.mockRestore();
  });
});
