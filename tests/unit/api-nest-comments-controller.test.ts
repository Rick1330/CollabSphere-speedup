import assert from "node:assert/strict";
import test from "node:test";
import "../integration/nest-api-http-env.setup.ts";
import { CommentsNestController } from "../../apps/api/src/comments/comments.nest.controller.js";
import type { CommentsService } from "../../apps/api/src/comments/comments.service.js";

const createController = () => {
  const commentsService: Pick<
    CommentsService,
    "listThreads" | "createThread" | "createReply" | "resolveThread" | "unresolveThread" | "updateComment" | "deleteComment"
  > = {
    listThreads: async () => ({
      threads: [{ id: "thread-1", status: "open", comments: [{ id: "c-1", contentPlaintext: "hello" }] }],
    }),
    createThread: async () =>
      ({ id: "thread-2", status: "open", comments: [{ id: "c-2", contentPlaintext: "new" }] }) as never,
    createReply: async () => ({ id: "c-3", threadId: "thread-2", contentPlaintext: "reply" }) as never,
    resolveThread: async () => ({ id: "thread-2", status: "resolved" }) as never,
    unresolveThread: async () => ({ id: "thread-2", status: "open" }) as never,
    updateComment: async () => ({ id: "c-2", contentPlaintext: "updated" }) as never,
    deleteComment: async () => ({ id: "c-2", isDeleted: true }) as never,
  };
  return new CommentsNestController(commentsService as CommentsService);
};

test("CommentsNestController lists and creates threads in response envelope", async () => {
  const controller = createController();
  const listed = await controller.listComments("ws-1", "user-1", "req-1", {
    targetType: "task",
    targetId: "00000000-0000-4000-8000-000000000123",
  });
  assert.equal(Array.isArray(listed.data.resource.threads), true);

  const created = await controller.createThread(
    "ws-1",
    "user-1",
    "req-2",
    { targetType: "task", targetId: "00000000-0000-4000-8000-000000000123" },
    {
      content: [{ type: "text", text: "hello" }],
    },
  );
  assert.equal(created.statusCode, 201);
  assert.equal(created.data.resource.thread.id, "thread-2");
});

test("CommentsNestController wraps replies, resolve/unresolve, update, and delete", async () => {
  const controller = createController();

  const reply = await controller.createReply("ws-1", "thread-2", "user-1", "req-3", {
    content: [{ type: "text", text: "reply" }],
  });
  assert.equal(reply.statusCode, 201);
  assert.equal(reply.data.resource.reply.id, "c-3");

  const resolved = await controller.resolveThread("ws-1", "thread-2", "user-1", "req-4", {});
  assert.equal(resolved.data.resource.thread.status, "resolved");

  const reopened = await controller.resolveThread("ws-1", "thread-2", "user-1", "req-5", { resolved: false });
  assert.equal(reopened.data.resource.thread.status, "open");

  const updated = await controller.updateComment("ws-1", "c-2", "user-1", "req-6", {
    content: [{ type: "text", text: "updated" }],
  });
  assert.equal(updated.data.resource.comment.id, "c-2");

  const deleted = await controller.deleteComment("ws-1", "c-2", "user-1", "req-7");
  assert.equal(deleted.data.resource.comment.isDeleted, true);
});
