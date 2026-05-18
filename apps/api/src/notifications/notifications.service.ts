import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { RealtimeEventsService } from "../realtime/realtime-events.service.js";
import { categoryTypeFilter } from "./notifications-category.js";

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  async getUnreadCount(actorUserId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: { recipientId: actorUserId, isRead: false, deletedAt: null },
    });
    return { unreadCount };
  }

  async listNotifications(input: {
    actorUserId: string;
    page: number;
    pageSize: number;
    unreadOnly?: boolean;
    category?: string;
  }) {
    const page = Math.max(1, Number(input.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(input.pageSize) || 20));
    const categoryFilter =
      input.category && input.category !== "all" ? categoryTypeFilter(input.category) : null;

    const where: Prisma.NotificationWhereInput = {
      recipientId: input.actorUserId,
      deletedAt: null,
      ...(input.unreadOnly ? { isRead: false } : {}),
      ...(categoryFilter ?? {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          workspaceId: true,
          url: true,
          isRead: true,
          readAt: true,
          createdAt: true,
          workspace: { select: { name: true } },
        },
      }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      workspaceId: row.workspaceId ?? "global",
      workspaceName: row.workspace?.name ?? "Workspace",
      url: row.url ?? "/notifications",
      isRead: row.isRead,
      readAt: row.readAt,
      createdAt: row.createdAt,
    }));
    return { items, total };
  }

  async markRead(actorUserId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientId: actorUserId, deletedAt: null },
    });
    if (!notification) {
      throw new AppError({ code: "NOT_FOUND", message: "Notification not found." });
    }
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: notification.isRead ? {} : { isRead: true, readAt: new Date() },
    });
    this.realtimeEvents.emitNotification("notification:read", {
      workspaceId: notification.workspaceId ?? "global",
      userId: actorUserId,
      data: { id: notification.id },
    });
    return updated;
  }

  async markAllRead(actorUserId: string) {
    const pending = await this.prisma.notification.findMany({
      where: { recipientId: actorUserId, isRead: false, deletedAt: null },
      select: { id: true, workspaceId: true },
    });
    if (pending.length === 0) {
      return { updatedCount: 0 };
    }
    await this.prisma.notification.updateMany({
      where: { recipientId: actorUserId, isRead: false, deletedAt: null },
      data: { isRead: true, readAt: new Date() },
    });
    for (const item of pending) {
      this.realtimeEvents.emitNotification("notification:read", {
        workspaceId: item.workspaceId ?? "global",
        userId: actorUserId,
        data: { id: item.id },
      });
    }
    return { updatedCount: pending.length };
  }

  async getPreferences(actorUserId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId: actorUserId },
    });
    if (pref) return pref;
    return this.prisma.notificationPreference.create({
      data: {
        userId: actorUserId,
        inApp: {},
        email: {},
      },
    });
  }

  async updatePreferences(
    actorUserId: string,
    input: {
      inApp: Record<string, boolean>;
      email: Record<string, boolean>;
      dailyDigestEnabled: boolean;
      weeklyDigestEnabled: boolean;
    },
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId: actorUserId },
      create: { userId: actorUserId, ...input },
      update: input,
    });
  }
}
