import type { ActivityEvent as PrismaActivityEvent, ResourceType } from "@prisma/client";

/** Keys the web client understands (`apps/web/src/api/adapters/activity.ts`). */
const KNOWN_EVENT_KEYS = new Set<string>([
  "task.created",
  "task.assigned",
  "task.status_changed",
  "task.completed",
  "task.deleted",
  "document.created",
  "document.renamed",
  "document.moved",
  "document.locked",
  "document.unlocked",
  "document.version_created",
  "document.version_restored",
  "document.submitted",
  "document.reviewed",
  "workspace.member_joined",
  "workspace.member_removed",
  "workspace.member_role_changed",
  "workspace.role_changed",
  "workspace.created",
  "workspace.archived",
  "workspace.unarchived",
  "comment.created",
  "comment.resolved",
]);

export type ActivityEventListItem = {
  id: string;
  eventKey: string;
  actor: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    isFormer?: boolean;
  };
  summary: string;
  resource?: { type: "document" | "task" | "comment" | "workspace"; id: string; title: string };
  createdAt: string;
};

const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

function mapResourceType(
  rt: ResourceType | null,
): "document" | "task" | "comment" | "workspace" | undefined {
  if (!rt) return undefined;
  if (rt === "document") return "document";
  if (rt === "task") return "task";
  if (rt === "workspace") return "workspace";
  if (rt === "comment_thread") return "comment";
  return undefined;
}

/**
 * Maps Prisma `activity_events` rows to the list shape expected by the Vite app
 * (`ActivityEvent` in `apps/web/src/api/adapters/activity.ts`).
 */
export function toActivityEventListItem(row: PrismaActivityEvent): ActivityEventListItem {
  const eventKey = KNOWN_EVENT_KEYS.has(row.eventKey) ? row.eventKey : "workspace.created";
  const actorId =
    typeof row.actorId === "string" && row.actorId.length > 0 ? row.actorId : SYSTEM_ACTOR_ID;
  const resourceType = mapResourceType(row.resourceType);
  const resource =
    resourceType &&
    typeof row.resourceId === "string" &&
    row.resourceId.length > 0 &&
    typeof row.resourceTitleSnapshot === "string" &&
    row.resourceTitleSnapshot.length > 0
      ? {
          type: resourceType,
          id: row.resourceId,
          title: row.resourceTitleSnapshot,
        }
      : undefined;

  return {
    id: row.id,
    eventKey,
    actor: {
      id: actorId,
      fullName: row.actorNameSnapshot || "Unknown",
      ...(row.actorAvatarSnapshot ? { avatarUrl: row.actorAvatarSnapshot } : {}),
    },
    summary: row.summary,
    resource,
    createdAt:
      row.createdAt instanceof Date && !Number.isNaN(row.createdAt.getTime())
        ? row.createdAt.toISOString()
        : new Date(0).toISOString(),
  };
}
