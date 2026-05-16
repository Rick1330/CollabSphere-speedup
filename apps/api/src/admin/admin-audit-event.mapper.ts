import type { AuditLog, User } from "@prisma/client";

export type AuditLogWithActor = AuditLog & {
  actor: Pick<User, "fullName"> | null;
};

export type AuditEventListItem = {
  id: string;
  eventType: string;
  severity: "info" | "warn" | "error";
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  ipAddress: string;
  details: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

function normalizeSeverity(raw: string): "info" | "warn" | "error" {
  if (raw === "warn" || raw === "error") return raw;
  return "info";
}

function auditDetails(actionKey: string, metadata: unknown): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const m = metadata as Record<string, unknown>;
    const keys = Object.keys(m);
    if (keys.length === 0) return actionKey;
    return keys
      .slice(0, 5)
      .map((k) => {
        const v = m[k];
        const s = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
        return `${k}=${s.length > 48 ? `${s.slice(0, 48)}…` : s}`;
      })
      .join(" · ");
  }
  return actionKey;
}

function asMetadataRecord(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

/** Maps `audit_log` rows (+ optional actor join) to the admin UI contract. */
export function toAuditEventListItem(row: AuditLogWithActor): AuditEventListItem {
  return {
    id: row.id,
    eventType: row.actionKey,
    severity: normalizeSeverity(row.severity),
    actorId: row.actorId,
    actorName: row.actor?.fullName ?? null,
    actorEmail: row.actorEmail,
    ipAddress: row.ipAddress ?? "",
    details: auditDetails(row.actionKey, row.metadata),
    metadata: asMetadataRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
  };
}
