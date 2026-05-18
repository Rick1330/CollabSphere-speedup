import assert from "node:assert/strict";
import test from "node:test";

function buildMentionNotificationUrl(input: {
  workspaceId: string;
  targetType: "document" | "task";
  targetId: string;
  threadId: string;
}): string {
  if (input.targetType === "document") {
    return `/w/${input.workspaceId}/documents/${input.targetId}?tab=comments&thread=${input.threadId}`;
  }
  return `/w/${input.workspaceId}/tasks/${input.targetId}?thread=${input.threadId}`;
}

test("mention notification url for document threads includes comments tab", () => {
  const url = buildMentionNotificationUrl({
    workspaceId: "ws-1",
    targetType: "document",
    targetId: "doc-1",
    threadId: "thread-1",
  });
  assert.equal(url, "/w/ws-1/documents/doc-1?tab=comments&thread=thread-1");
});

test("mention notification url for task threads uses task path", () => {
  const url = buildMentionNotificationUrl({
    workspaceId: "ws-1",
    targetType: "task",
    targetId: "task-1",
    threadId: "thread-2",
  });
  assert.equal(url, "/w/ws-1/tasks/task-1?thread=thread-2");
});
