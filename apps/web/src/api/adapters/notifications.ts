import { request } from "@/api/client";

export type NotificationType =
  | "task.assigned"
  | "task.completed"
  | "task.status_changed"
  | "document.mention"
  | "document.submitted"
  | "document.approved"
  | "comment.reply"
  | "comment.mention"
  | "workspace.member_joined"
  | "workspace.invitation"
  | "deadline.reminder";

export type NotificationCategory = "tasks" | "documents" | "comments" | "workspace" | "deadlines";

export const NOTIFICATION_CATEGORY: Record<NotificationType, NotificationCategory> = {
  "task.assigned": "tasks",
  "task.completed": "tasks",
  "task.status_changed": "tasks",
  "document.mention": "documents",
  "document.submitted": "documents",
  "document.approved": "documents",
  "comment.reply": "comments",
  "comment.mention": "comments",
  "workspace.member_joined": "workspace",
  "workspace.invitation": "workspace",
  "deadline.reminder": "deadlines",
};

export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  { label: string; tone: "teal" | "sky" | "stone" | "emerald" | "amber" }
> = {
  tasks: { label: "Tasks", tone: "teal" },
  documents: { label: "Documents", tone: "sky" },
  comments: { label: "Comments", tone: "stone" },
  workspace: { label: "Workspace", tone: "emerald" },
  deadlines: { label: "Deadlines", tone: "amber" },
};

/** Maps API notification type strings to UI categories (includes unknown future types). */
export function resolveNotificationCategory(type: string): NotificationCategory {
  if (type in NOTIFICATION_CATEGORY) {
    return NOTIFICATION_CATEGORY[type as NotificationType];
  }
  if (type.startsWith("task.")) return "tasks";
  if (type.startsWith("document.")) return "documents";
  if (type.startsWith("comment.")) return "comments";
  if (type.startsWith("workspace.")) return "workspace";
  if (type.startsWith("deadline.")) return "deadlines";
  return "comments";
}

export interface Notification {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  workspaceId: string;
  workspaceName: string;
  url: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  data: { items: Notification[] };
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export interface NotificationPreferences {
  inApp: Record<string, boolean>;
  email: Record<string, boolean>;
  dailyDigestEnabled: boolean;
  weeklyDigestEnabled: boolean;
}

export const NOTIFICATION_TYPES: { key: string; label: string }[] = [
  { key: "task.assigned", label: "Task assigned to you" },
  { key: "task.completed", label: "Task completed" },
  { key: "task.status_changed", label: "Task status changed" },
  { key: "document.mention", label: "Mentioned in a document" },
  { key: "comment.reply", label: "Reply to your comment" },
  { key: "workspace.member_joined", label: "New member joined" },
  { key: "workspace.invitation", label: "Workspace invitation" },
  { key: "deadline.reminder", label: "Deadline reminders" },
];

type ListEnvelope<T> = { data?: { items?: T[]; total?: number }; meta?: { pagination?: NotificationPage["meta"]["pagination"] } };
type SingleEnvelope<T> = { data?: { resource?: T } };
type ActionEnvelope = { data?: { extraData?: Record<string, unknown> } };

export async function fetchNotifications(params: {
  page: number;
  pageSize: number;
  unreadOnly: boolean;
  category?: NotificationCategory | "all";
}): Promise<NotificationPage> {
  const q = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    unreadOnly: String(params.unreadOnly),
  });
  if (params.category) q.set("category", params.category);
  const payload = await request<ListEnvelope<Notification>>(`/notifications?${q.toString()}`);
  return {
    data: { items: payload.data?.items ?? [] },
    meta: {
      pagination:
        payload.meta?.pagination ?? {
          page: params.page,
          pageSize: params.pageSize,
          totalItems: payload.data?.total ?? 0,
          totalPages: Math.max(1, Math.ceil((payload.data?.total ?? 0) / params.pageSize)),
        },
    },
  };
}

export async function fetchUnreadCount(): Promise<{ data: { unreadCount: number } }> {
  const payload = await request<SingleEnvelope<{ unreadCount: number }>>("/notifications/unread-count");
  return { data: { unreadCount: payload.data?.resource?.unreadCount ?? 0 } };
}

export async function fetchNotificationCategoryCounts(unreadOnly: boolean): Promise<
  { data: { all: number; byCategory: Record<NotificationCategory, number> } }
> {
  const page = await fetchNotifications({ page: 1, pageSize: 100, unreadOnly, category: "all" });
  const byCategory: Record<NotificationCategory, number> = {
    tasks: 0,
    documents: 0,
    comments: 0,
    workspace: 0,
    deadlines: 0,
  };
  for (const item of page.data.items) {
    byCategory[resolveNotificationCategory(item.type)] += 1;
  }
  return { data: { all: page.meta.pagination.totalItems, byCategory } };
}

export async function markNotificationRead(id: string): Promise<void> {
  await request(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<{ data: { updatedCount: number } }> {
  const payload = await request<ActionEnvelope>("/notifications/read-all", { method: "PATCH" });
  return { data: { updatedCount: Number(payload.data?.extraData?.updatedCount ?? 0) } };
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const payload = await request<SingleEnvelope<NotificationPreferences>>("/notifications/preferences");
  return (
    payload.data?.resource ?? {
      inApp: {},
      email: {},
      dailyDigestEnabled: false,
      weeklyDigestEnabled: false,
    }
  );
}

export async function updateNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  await request("/notifications/preferences", {
    method: "PATCH",
    body: prefs,
  });
}
