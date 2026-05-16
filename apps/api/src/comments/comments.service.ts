import { type CommentTargetType, type WorkspaceRole } from "@prisma/client";
import { Inject, Injectable } from "@nestjs/common";
import { isDatabaseUuidParam } from "../common/auth/request-user.js";
import { AppError, ValidationAppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { RealtimeEventsService } from "../realtime/realtime-events.service.js";

type WorkspaceMembership = {
  role: WorkspaceRole;
  workspace: { status: string };
};

type MentionNode = {
  type: "mention";
  userId: string;
  display: string;
};

type TextNode = {
  type: "text";
  text: string;
};

export type CommentContentNode = MentionNode | TextNode;

const canModerateRoles = new Set<WorkspaceRole>(["OWNER", "ADMIN", "MANAGER"]);

@Injectable()
export class CommentsService {
  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  async listThreads(input: {
    actorUserId: string;
    workspaceId: string;
    targetType: CommentTargetType;
    targetId: string;
  }) {
    await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    await this.assertTargetExists(input.workspaceId, input.targetType, input.targetId);
    const threads = await this.prisma.commentThread.findMany({
      where: {
        workspaceId: input.workspaceId,
        targetType: input.targetType,
        targetId: input.targetId,
        deletedAt: null,
      },
      orderBy: [{ createdAt: "asc" }],
      include: {
        comments: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: "asc" }],
          include: { mentions: true },
        },
      },
    });
    return { threads };
  }

  async createThread(input: {
    actorUserId: string;
    workspaceId: string;
    targetType: CommentTargetType;
    targetId: string;
    content: CommentContentNode[];
    anchor?: Record<string, unknown> | null;
  }) {
    const membership = await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    this.assertCanWriteComments(membership);
    await this.assertTargetExists(input.workspaceId, input.targetType, input.targetId);
    const author = await this.getAuthor(input.actorUserId);
    const normalized = this.normalizeContent(input.content);
    const mentionUserIds = await this.extractAndValidateMentions({
      workspaceId: input.workspaceId,
      nodes: normalized,
    });
    const thread = await this.prisma.$transaction(async (tx) => {
      const createdThread = await tx.commentThread.create({
        data: {
          workspaceId: input.workspaceId,
          targetType: input.targetType,
          targetId: input.targetId,
          anchor: (input.anchor ?? null) as never,
          createdById: input.actorUserId,
        },
      });
      const createdComment = await tx.comment.create({
        data: {
          workspaceId: input.workspaceId,
          threadId: createdThread.id,
          authorId: input.actorUserId,
          authorNameSnapshot: author.fullName,
          authorAvatarSnapshot: author.avatarUrl,
          content: normalized as never,
          contentPlaintext: this.toPlaintext(normalized),
          mentions: {
            createMany: {
              data: mentionUserIds.map((mentionedUserId) => ({
                workspaceId: input.workspaceId,
                mentionedUserId,
              })),
              skipDuplicates: true,
            },
          },
        },
        include: { mentions: true },
      });
      return { ...createdThread, comments: [createdComment] };
    });
    await this.emitMutation({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      event: "comment:thread_created",
      actionKey: "comment.thread_created",
      summary: "Comment thread created",
      resourceId: thread.id,
      resourceTitleSnapshot: this.toPlaintext(normalized).slice(0, 255),
      metadata: { threadId: thread.id, targetType: input.targetType, targetId: input.targetId },
    });
    return thread;
  }

  async createReply(input: {
    actorUserId: string;
    workspaceId: string;
    threadId: string;
    content: CommentContentNode[];
  }) {
    const membership = await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    this.assertCanWriteComments(membership);
    const thread = await this.getThreadOrThrow(input.workspaceId, input.threadId);
    const author = await this.getAuthor(input.actorUserId);
    const normalized = this.normalizeContent(input.content);
    const mentionUserIds = await this.extractAndValidateMentions({
      workspaceId: input.workspaceId,
      nodes: normalized,
    });
    const reply = await this.prisma.comment.create({
      data: {
        workspaceId: input.workspaceId,
        threadId: thread.id,
        authorId: input.actorUserId,
        authorNameSnapshot: author.fullName,
        authorAvatarSnapshot: author.avatarUrl,
        content: normalized as never,
        contentPlaintext: this.toPlaintext(normalized),
        mentions: {
          createMany: {
            data: mentionUserIds.map((mentionedUserId) => ({
              workspaceId: input.workspaceId,
              mentionedUserId,
            })),
            skipDuplicates: true,
          },
        },
      },
      include: { mentions: true },
    });
    await this.emitMutation({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      event: "comment:reply_created",
      actionKey: "comment.reply_created",
      summary: "Comment reply added",
      resourceId: thread.id,
      resourceTitleSnapshot: this.toPlaintext(normalized).slice(0, 255),
      metadata: { threadId: thread.id, commentId: reply.id, targetType: thread.targetType, targetId: thread.targetId },
    });
    return reply;
  }

  async resolveThread(input: { actorUserId: string; workspaceId: string; threadId: string }) {
    return this.setThreadResolvedState({ ...input, resolved: true });
  }

  async unresolveThread(input: { actorUserId: string; workspaceId: string; threadId: string }) {
    return this.setThreadResolvedState({ ...input, resolved: false });
  }

  async updateComment(input: {
    actorUserId: string;
    workspaceId: string;
    commentId: string;
    content: CommentContentNode[];
  }) {
    const membership = await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    this.assertCanWriteComments(membership);
    const comment = await this.prisma.comment.findFirst({
      where: { id: input.commentId, workspaceId: input.workspaceId, deletedAt: null },
      include: { thread: true },
    });
    if (!comment) {
      throw new AppError({ code: "NOT_FOUND", message: "Comment not found." });
    }
    if (comment.authorId !== input.actorUserId && !canModerateRoles.has(membership.role)) {
      throw new AppError({ code: "INSUFFICIENT_ROLE" });
    }
    const normalized = this.normalizeContent(input.content);
    const mentionUserIds = await this.extractAndValidateMentions({
      workspaceId: input.workspaceId,
      nodes: normalized,
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.commentMention.deleteMany({ where: { commentId: comment.id } });
      return tx.comment.update({
        where: { id: comment.id },
        data: {
          content: normalized as never,
          contentPlaintext: this.toPlaintext(normalized),
          mentions: {
            createMany: {
              data: mentionUserIds.map((mentionedUserId) => ({
                workspaceId: input.workspaceId,
                mentionedUserId,
              })),
              skipDuplicates: true,
            },
          },
        },
        include: { mentions: true },
      });
    });
    await this.emitMutation({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      event: "comment:updated",
      actionKey: "comment.updated",
      summary: "Comment updated",
      resourceId: comment.thread.id,
      resourceTitleSnapshot: this.toPlaintext(normalized).slice(0, 255),
      metadata: { threadId: comment.thread.id, commentId: comment.id },
    });
    return updated;
  }

  async deleteComment(input: { actorUserId: string; workspaceId: string; commentId: string }) {
    const membership = await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    this.assertCanWriteComments(membership);
    const comment = await this.prisma.comment.findFirst({
      where: { id: input.commentId, workspaceId: input.workspaceId, deletedAt: null },
      include: { thread: true },
    });
    if (!comment) {
      throw new AppError({ code: "NOT_FOUND", message: "Comment not found." });
    }
    if (comment.authorId !== input.actorUserId && !canModerateRoles.has(membership.role)) {
      throw new AppError({ code: "INSUFFICIENT_ROLE" });
    }
    const deleted = await this.prisma.comment.update({
      where: { id: comment.id },
      data: { isDeleted: true, deletedAt: new Date(), contentPlaintext: "[deleted]" },
      include: { mentions: true },
    });
    await this.emitMutation({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      event: "comment:deleted",
      actionKey: "comment.deleted",
      summary: "Comment deleted",
      resourceId: comment.thread.id,
      resourceTitleSnapshot: null,
      metadata: { threadId: comment.thread.id, commentId: comment.id },
    });
    return deleted;
  }

  private async setThreadResolvedState(input: {
    actorUserId: string;
    workspaceId: string;
    threadId: string;
    resolved: boolean;
  }) {
    const membership = await this.requireWorkspaceMembership(input.actorUserId, input.workspaceId);
    const thread = await this.getThreadOrThrow(input.workspaceId, input.threadId);
    const canModerate = canModerateRoles.has(membership.role);
    if (!canModerate && thread.createdById !== input.actorUserId) {
      throw new AppError({ code: "INSUFFICIENT_ROLE" });
    }
    const updated = await this.prisma.commentThread.update({
      where: { id: thread.id },
      data: {
        status: input.resolved ? "resolved" : "open",
        resolvedById: input.resolved ? input.actorUserId : null,
        resolvedAt: input.resolved ? new Date() : null,
      },
      include: { comments: { where: { deletedAt: null }, orderBy: { createdAt: "asc" }, include: { mentions: true } } },
    });
    await this.emitMutation({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      event: input.resolved ? "comment:resolved" : "comment:unresolved",
      actionKey: input.resolved ? "comment.resolved" : "comment.unresolved",
      summary: input.resolved ? "Comment thread resolved" : "Comment thread reopened",
      resourceId: updated.id,
      resourceTitleSnapshot: null,
      metadata: { threadId: updated.id, targetType: updated.targetType, targetId: updated.targetId },
    });
    return updated;
  }

  private async emitMutation(input: {
    workspaceId: string;
    actorUserId: string;
    event: `comment:${string}`;
    actionKey: string;
    summary: string;
    resourceId: string;
    resourceTitleSnapshot: string | null;
    metadata: Record<string, unknown>;
  }) {
    const actor = await this.getAuthor(input.actorUserId);
    const activity = await this.prisma.activityEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actorUserId,
        actorNameSnapshot: actor.fullName,
        actorAvatarSnapshot: actor.avatarUrl ?? null,
        eventKey: input.actionKey,
        summary: input.summary,
        resourceType: "comment_thread",
        resourceId: input.resourceId,
        resourceTitleSnapshot: input.resourceTitleSnapshot,
        metadata: input.metadata as never,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        severity: "info",
        actionKey: input.actionKey,
        actorId: input.actorUserId,
        actorEmail: actor.email,
        actorGlobalRole: actor.globalRole,
        workspaceId: input.workspaceId,
        targetType: "comment_thread",
        targetId: input.resourceId,
        metadata: input.metadata as never,
      },
    });
    this.realtimeEvents.emitComment(input.event, {
      workspaceId: input.workspaceId,
      data: input.metadata,
      taskId: null,
      userId: null,
    });
    this.realtimeEvents.emitActivityFromRecord(activity);
  }

  private normalizeContent(content: CommentContentNode[]): CommentContentNode[] {
    if (!Array.isArray(content) || content.length === 0) {
      throw new ValidationAppError({
        message: "Comment content must include at least one node.",
        issues: [{ field: "content", rule: "required", message: "Comment content must include at least one node." }],
      });
    }
    const normalized: CommentContentNode[] = [];
    for (const node of content) {
      if (!node || typeof node !== "object") {
        continue;
      }
      if (node.type === "text") {
        const text = String(node.text ?? "");
        if (text) normalized.push({ type: "text", text });
        continue;
      }
      if (node.type === "mention") {
        const userId = String(node.userId ?? "").trim();
        const display = String(node.display ?? "").trim();
        if (userId && display) normalized.push({ type: "mention", userId, display });
      }
    }
    if (normalized.length === 0 || !this.toPlaintext(normalized).trim()) {
      throw new ValidationAppError({
        message: "Comment content cannot be empty.",
        issues: [{ field: "content", rule: "required", message: "Comment content cannot be empty." }],
      });
    }
    return normalized;
  }

  private toPlaintext(content: CommentContentNode[]): string {
    return content
      .map((node) => (node.type === "mention" ? `@${node.display}` : node.text))
      .join("")
      .slice(0, 10_000);
  }

  private async extractAndValidateMentions(input: {
    workspaceId: string;
    nodes: CommentContentNode[];
  }): Promise<string[]> {
    const mentionUserIds = Array.from(
      new Set(
        input.nodes.filter((node): node is MentionNode => node.type === "mention").map((node) => node.userId),
      ),
    );
    if (mentionUserIds.length === 0) {
      return [];
    }
    const members = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId: input.workspaceId,
        userId: { in: mentionUserIds },
        isActive: true,
        deletedAt: null,
      },
      select: { userId: true },
    });
    const validUserIds = new Set(members.map((member) => member.userId));
    const invalid = mentionUserIds.filter((id) => !validUserIds.has(id));
    if (invalid.length > 0) {
      throw new AppError({ code: "INVALID_MENTION", message: "Mentioned users must belong to the workspace." });
    }
    return mentionUserIds;
  }

  private async getThreadOrThrow(workspaceId: string, threadId: string) {
    const thread = await this.prisma.commentThread.findFirst({
      where: { id: threadId, workspaceId, deletedAt: null },
    });
    if (!thread) {
      throw new AppError({ code: "NOT_FOUND", message: "Comment thread not found." });
    }
    return thread;
  }

  private async requireWorkspaceMembership(actorUserId: string, workspaceId: string): Promise<WorkspaceMembership> {
    if (!isDatabaseUuidParam(workspaceId)) {
      throw new ValidationAppError({
        issues: [
          {
            field: "workspaceId",
            message: "Workspace id must be a UUID.",
            rule: "uuid",
          },
        ],
      });
    }

    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        userId: actorUserId,
        workspaceId,
        isActive: true,
        deletedAt: null,
        leftAt: null,
        workspace: { deletedAt: null },
      },
      select: { role: true, workspace: { select: { status: true } } },
    });
    if (membership) {
      return membership;
    }

    const actor = await this.prisma.user.findFirst({
      where: { id: actorUserId, deletedAt: null },
      select: { globalRole: true },
    });
    if (actor?.globalRole === "ADMIN") {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: workspaceId, deletedAt: null },
        select: { status: true },
      });
      if (!workspace) {
        throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
      }
      return { role: "VIEWER", workspace };
    }

    throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
  }

  private assertCanWriteComments(membership: WorkspaceMembership) {
    if (membership.workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }
    if (membership.role === "VIEWER") {
      throw new AppError({ code: "INSUFFICIENT_ROLE" });
    }
  }

  private async getAuthor(userId: string) {
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, avatarUrl: true, email: true, globalRole: true },
    });
    return {
      fullName: author?.fullName ?? "Unknown user",
      avatarUrl: author?.avatarUrl ?? null,
      email: author?.email ?? null,
      globalRole: author?.globalRole ?? null,
    };
  }

  private async assertTargetExists(workspaceId: string, targetType: CommentTargetType, targetId: string) {
    if (targetType === "task") {
      const task = await this.prisma.task.findFirst({
        where: { id: targetId, workspaceId, deletedAt: null },
        select: { id: true },
      });
      if (!task) throw new AppError({ code: "TASK_NOT_FOUND" });
      return;
    }
    const doc = await this.prisma.document.findFirst({
      where: { id: targetId, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!doc) throw new AppError({ code: "DOCUMENT_NOT_FOUND" });
  }
}
