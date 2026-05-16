import assert from "node:assert/strict";
import test from "node:test";
import type { AuditLog } from "@prisma/client";
import { toAuditEventListItem } from "../../apps/api/src/admin/admin-audit-event.mapper.js";

function row(
  partial: Partial<AuditLog> & Pick<AuditLog, "id" | "actionKey">,
  actor: { fullName: string } | null,
): Parameters<typeof toAuditEventListItem>[0] {
  const createdAt = partial.createdAt ?? new Date("2026-03-01T10:00:00.000Z");
  return {
    id: partial.id,
    requestId: partial.requestId ?? null,
    severity: partial.severity ?? "info",
    actionKey: partial.actionKey,
    actorId: partial.actorId ?? null,
    actorEmail: partial.actorEmail ?? "a@example.com",
    actorGlobalRole: partial.actorGlobalRole ?? "ADMIN",
    workspaceId: partial.workspaceId ?? null,
    targetType: partial.targetType ?? "user",
    targetId: partial.targetId ?? null,
    ipAddress: partial.ipAddress ?? "127.0.0.1",
    userAgent: partial.userAgent ?? null,
    metadata: partial.metadata ?? { role: "ADMIN" },
    createdAt,
    actor,
  };
}

test("toAuditEventListItem maps actionKey to eventType and actor fullName", () => {
  const out = toAuditEventListItem(
    row(
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        actionKey: "admin.user.promoted",
        severity: "info",
      },
      { fullName: "Pat Admin" },
    ),
  );
  assert.equal(out.eventType, "admin.user.promoted");
  assert.equal(out.severity, "info");
  assert.equal(out.actorName, "Pat Admin");
  assert.equal(out.actorEmail, "a@example.com");
  assert.match(out.details, /role=/);
  assert.equal(out.createdAt, "2026-03-01T10:00:00.000Z");
});

test("toAuditEventListItem normalizes unknown severity to info", () => {
  const out = toAuditEventListItem(
    row({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", actionKey: "admin.audit.viewed", severity: "weird" }, null),
  );
  assert.equal(out.severity, "info");
  assert.equal(out.actorName, null);
});
