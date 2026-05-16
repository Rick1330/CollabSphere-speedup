import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityEvent as PrismaActivityEvent } from "@prisma/client";
import { toActivityEventListItem } from "../../apps/api/src/activity/activity-event.mapper.js";

function row(partial: Partial<PrismaActivityEvent> & Pick<PrismaActivityEvent, "id">): PrismaActivityEvent {
  const createdAt = partial.createdAt ?? new Date("2026-01-15T12:00:00.000Z");
  return {
    workspaceId: partial.workspaceId ?? "11111111-1111-1111-1111-111111111111",
    actorId: partial.actorId ?? null,
    actorNameSnapshot: partial.actorNameSnapshot ?? "Alice",
    actorAvatarSnapshot: partial.actorAvatarSnapshot ?? null,
    eventKey: partial.eventKey ?? "task.created",
    summary: partial.summary ?? "Created task",
    resourceType: partial.resourceType ?? null,
    resourceId: partial.resourceId ?? null,
    resourceTitleSnapshot: partial.resourceTitleSnapshot ?? null,
    metadata: partial.metadata ?? {},
    createdAt,
    id: partial.id,
  };
}

test("toActivityEventListItem maps actor, resource, and ISO createdAt", () => {
  const docId = "22222222-2222-2222-2222-222222222222";
  const actorId = "33333333-3333-3333-3333-333333333333";
  const out = toActivityEventListItem(
    row({
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      actorId,
      actorNameSnapshot: "Bob",
      eventKey: "document.created",
      summary: "New doc",
      resourceType: "document",
      resourceId: docId,
      resourceTitleSnapshot: "Spec",
      createdAt: new Date("2026-02-01T08:30:00.000Z"),
    }),
  );
  assert.equal(out.eventKey, "document.created");
  assert.deepEqual(out.actor, { id: actorId, fullName: "Bob" });
  assert.deepEqual(out.resource, { type: "document", id: docId, title: "Spec" });
  assert.equal(out.createdAt, "2026-02-01T08:30:00.000Z");
});

test("toActivityEventListItem maps comment_thread to comment resource type", () => {
  const out = toActivityEventListItem(
    row({
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      resourceType: "comment_thread",
      resourceId: "44444444-4444-4444-4444-444444444444",
      resourceTitleSnapshot: "Thread",
    }),
  );
  assert.deepEqual(out.resource?.type, "comment");
});

test("toActivityEventListItem uses system actor id and fallback eventKey when unknown", () => {
  const out = toActivityEventListItem(
    row({
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      actorId: null,
      eventKey: "custom.unknown_key",
    }),
  );
  assert.equal(out.actor.id, "00000000-0000-0000-0000-000000000000");
  assert.equal(out.eventKey, "workspace.created");
});

test("toActivityEventListItem falls back createdAt when value is not a valid Date", () => {
  const out = toActivityEventListItem(
    row({
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      createdAt: new Date(NaN),
    }),
  );
  assert.equal(out.createdAt, new Date(0).toISOString());
});
