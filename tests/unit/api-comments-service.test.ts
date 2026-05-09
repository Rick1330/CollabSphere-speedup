import assert from "node:assert/strict";
import test from "node:test";
import { CommentsService } from "../../apps/api/src/comments/comments.service.js";

const createService = (overrides: Record<string, unknown> = {}) => {
  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        role: "MEMBER",
        workspace: { status: "active" },
      }),
      findMany: async () => [{ userId: "00000000-0000-4000-8000-000000000010" }],
    },
    task: { findFirst: async () => ({ id: "task-1" }) },
    document: { findFirst: async () => ({ id: "doc-1" }) },
    commentThread: {
      create: async () => ({ id: "thread-1", targetType: "task", targetId: "task-1", createdById: "u-1" }),
      findMany: async () => [],
      findFirst: async () => ({
        id: "thread-1",
        createdById: "00000000-0000-4000-8000-000000000001",
        targetType: "task",
        targetId: "task-1",
      }),
      update: async () => ({ id: "thread-1", status: "resolved", targetType: "task", targetId: "task-1", comments: [] }),
    },
    comment: {
      create: async () => ({ id: "comment-1", mentions: [] }),
      findFirst: async () => ({
        id: "comment-1",
        authorId: "00000000-0000-4000-8000-000000000001",
        thread: { id: "thread-1" },
      }),
      update: async () => ({ id: "comment-1", isDeleted: true, mentions: [] }),
    },
    commentMention: {
      deleteMany: async () => ({ count: 0 }),
    },
    user: {
      findUnique: async () => ({
        fullName: "Alice",
        avatarUrl: null,
        email: "alice@example.com",
        globalRole: "USER",
      }),
    },
    activityEvent: {
      create: async () => ({
        id: "act-1",
        workspaceId: "ws-1",
        actorId: "u-1",
        actorNameSnapshot: "Alice",
        actorAvatarSnapshot: null,
        eventKey: "comment.thread_created",
        summary: "Comment thread created",
        resourceType: "comment_thread",
        resourceId: "thread-1",
        resourceTitleSnapshot: null,
        metadata: {},
        createdAt: new Date("2026-05-09T00:00:00.000Z"),
      }),
    },
    auditLog: { create: async () => ({ id: "audit-1" }) },
    $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    ...overrides,
  };
  const realtime = {
    emitComment: () => undefined,
    emitActivityFromRecord: () => undefined,
  };
  return new CommentsService(prisma as never, realtime as never);
};

test("CommentsService validates mention membership", async () => {
  const service = createService({
    workspaceMember: {
      findFirst: async () => ({
        role: "MEMBER",
        workspace: { status: "active" },
      }),
      findMany: async () => [],
    },
  });
  await assert.rejects(
    () =>
      service.createThread({
        actorUserId: "00000000-0000-4000-8000-000000000001",
        workspaceId: "ws-1",
        targetType: "task",
        targetId: "task-1",
        content: [{ type: "mention", userId: "00000000-0000-4000-8000-000000000010", display: "Bob" }],
      }),
    /Mentioned users must belong to the workspace/,
  );
});

test("CommentsService allows thread creation and resolve flow", async () => {
  const service = createService();
  const thread = await service.createThread({
    actorUserId: "00000000-0000-4000-8000-000000000001",
    workspaceId: "ws-1",
    targetType: "task",
    targetId: "task-1",
    content: [{ type: "text", text: "Looks good" }],
  });
  assert.equal(Array.isArray(thread.comments), true);

  const resolved = await service.resolveThread({
    actorUserId: "00000000-0000-4000-8000-000000000001",
    workspaceId: "ws-1",
    threadId: "thread-1",
  });
  assert.equal(resolved.status, "resolved");
});
