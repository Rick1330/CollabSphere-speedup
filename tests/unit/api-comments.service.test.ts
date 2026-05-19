import assert from "node:assert/strict";
import test from "node:test";
import { ResourceType } from "@prisma/client";
import { CommentsService } from "../../apps/api/src/comments/comments.service.js";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_ID = "22222222-2222-4222-8222-222222222222";
const ACTOR_ID = "33333333-3333-4333-8333-333333333333";

function createCommentsService(overrides?: {
  activityCreate?: () => Promise<unknown>;
  onEmit?: (event: string, payload: unknown) => void;
}) {
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const eventEmitter = {
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
      overrides?.onEmit?.(event, payload);
    },
  };

  const prisma = {
    workspaceMember: {
      findFirst: async () => ({
        role: "MEMBER",
        workspace: { status: "active" },
      }),
      findMany: async () => [],
    },
    document: {
      findFirst: async () => ({ id: DOCUMENT_ID }),
    },
    user: {
      findUnique: async () => ({
        fullName: "Test User",
        avatarUrl: null,
        email: "test@example.com",
        globalRole: "USER",
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        commentThread: {
          create: async () => ({
            id: "thread-1",
            workspaceId: WORKSPACE_ID,
            targetType: "document",
            targetId: DOCUMENT_ID,
          }),
        },
        comment: {
          create: async () => ({
            id: "comment-1",
            mentions: [],
          }),
        },
      };
      const thread = await fn(tx);
      return {
        ...(thread as Record<string, unknown>),
        comments: [{ id: "comment-1", mentions: [] }],
      };
    },
    activityEvent: {
      create: overrides?.activityCreate ?? (async () => ({
        id: "activity-1",
        workspaceId: WORKSPACE_ID,
      })),
    },
    auditLog: {
      create: async () => ({ id: "audit-1" }),
    },
    notification: {
      create: async () => ({ id: "notification-1" }),
    },
  };

  const realtimeEvents = {
    emitNotification: () => undefined,
  };

  const service = new CommentsService(
    prisma as never,
    realtimeEvents as never,
    eventEmitter as never,
  );

  return { service, emitted };
}

test("createThread returns persisted thread for document target", async () => {
  const { service } = createCommentsService();
  const thread = await service.createThread({
    actorUserId: ACTOR_ID,
    workspaceId: WORKSPACE_ID,
    targetType: "document",
    targetId: DOCUMENT_ID,
    content: [{ type: "text", text: "hello" }],
  });

  assert.equal(thread.id, "thread-1");
  assert.equal(thread.comments[0]?.id, "comment-1");
});

test("createThread emits comment.created even when activity persistence fails", async () => {
  const { service, emitted } = createCommentsService({
    activityCreate: async () => {
      throw new Error("activity table missing");
    },
  });

  const thread = await service.createThread({
    actorUserId: ACTOR_ID,
    workspaceId: WORKSPACE_ID,
    targetType: "document",
    targetId: DOCUMENT_ID,
    content: [{ type: "text", text: "hello" }],
  });

  assert.equal(thread.id, "thread-1");
  const created = emitted.find((entry) => entry.event === "comment.created");
  assert.ok(created, "expected comment.created domain event");
  assert.equal((created.payload as { threadId?: string }).threadId, "thread-1");
  assert.equal((created.payload as { targetId?: string }).targetId, DOCUMENT_ID);
});

test("emitMutation uses ResourceType.comment_thread for activity events", async () => {
  let capturedResourceType: ResourceType | undefined;
  const { service } = createCommentsService({
    activityCreate: async (args: { data: { resourceType: ResourceType } }) => {
      capturedResourceType = args.data.resourceType;
      return { id: "activity-1" };
    },
  });

  await service.createThread({
    actorUserId: ACTOR_ID,
    workspaceId: WORKSPACE_ID,
    targetType: "document",
    targetId: DOCUMENT_ID,
    content: [{ type: "text", text: "hello" }],
  });

  assert.equal(capturedResourceType, ResourceType.comment_thread);
});
