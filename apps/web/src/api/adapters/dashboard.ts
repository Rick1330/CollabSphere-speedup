/**
 * Dashboard API adapter — workspaces, assigned tasks, and cross-workspace activity.
 */
import type { ActivityEvent as ApiActivityEvent } from "@/api/adapters/activity";
import { fetchWorkspaceActivityPaginated } from "@/api/adapters/activity";
import { fetchCurrentUser } from "@/api/adapters/settings";
import { listTasksMap } from "@/api/adapters/tasks";
import type { TaskDetail } from "@/features/tasks/mocks/tasks";
import { getWorkspaceRoleLabel } from "@/lib/role-labels";
import { listMineWorkspaceRows } from "@/api/adapters/workspaces";

export type DashboardWorkspaceSummary = {
  id: string;
  name: string;
  description: string;
  type: "professional" | "academic" | "general";
  icon?: string;
  docs: number;
  tasks: number;
  memberCount: number;
  recentMembers: { id: string; fullName: string }[];
  roleLabel: string;
  lastAccessedAt: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "todo" | "in_progress" | "in_review";
  dueDate?: string;
};

export type DashboardActivityEvent = {
  id: string;
  actor: { id: string; fullName: string };
  action: "created" | "updated" | "commented" | "completed" | "shared";
  resource?: { type: "doc" | "task"; title: string };
  workspaceName: string;
  createdAt: string;
};

export async function getDashboardWorkspaces(): Promise<DashboardWorkspaceSummary[]> {
  const rows = await listMineWorkspaceRows();
  return rows.map((row) => ({
    id: row.workspace.id,
    name: row.workspace.name,
    description: row.workspace.description ?? "",
    type: row.workspace.type,
    icon: row.workspace.icon ?? undefined,
    docs: row.documentCount,
    tasks: row.taskCount,
    memberCount: row.memberCount,
    recentMembers: row.recentMembers,
    roleLabel: getWorkspaceRoleLabel(row.workspace.type, row.role),
    lastAccessedAt: row.workspace.updatedAt,
  }));
}

function mapTaskStatus(s: string): DashboardTask["status"] {
  if (s === "in_review") return "in_review";
  if (s === "in_progress") return "in_progress";
  return "todo";
}

function mapTaskPriority(p: string): DashboardTask["priority"] {
  if (p === "urgent" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

export async function getDashboardTasks(): Promise<DashboardTask[]> {
  let meId: string;
  try {
    meId = (await fetchCurrentUser()).id;
  } catch {
    return [];
  }
  const rows = await listMineWorkspaceRows();
  const acc: DashboardTask[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(0, 8)) {
    let map;
    try {
      map = await listTasksMap(row.workspace.id);
    } catch {
      continue;
    }
    for (const t of Object.values(map) as TaskDetail[]) {
      if (t.status === "done" || t.status === "backlog") continue;
      if (t.assignee?.id !== meId) continue;
      const key = `${row.workspace.id}:${t.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      acc.push({
        id: t.id,
        title: t.title,
        workspaceId: row.workspace.id,
        workspaceName: row.workspace.name,
        priority: mapTaskPriority(t.priority),
        status: mapTaskStatus(t.status),
        dueDate: t.dueDate ?? undefined,
      });
    }
  }

  acc.sort((a, b) => String(b.dueDate ?? "").localeCompare(String(a.dueDate ?? "")));
  return acc.slice(0, 24);
}

function deriveDashboardAction(eventKey: ApiActivityEvent["eventKey"]): DashboardActivityEvent["action"] {
  if (
    eventKey.startsWith("comment.") ||
    eventKey === "comment.created" ||
    eventKey.includes("comment")
  ) {
    return "commented";
  }
  if (eventKey.includes("completed")) return "completed";
  if (eventKey.includes(".created") || eventKey.endsWith("_created")) return "created";
  if (eventKey.includes("shared")) return "shared";
  return "updated";
}

function mapApiActivityToDashboard(e: ApiActivityEvent, workspaceName: string): DashboardActivityEvent | null {
  const action = deriveDashboardAction(e.eventKey);
  let resource: DashboardActivityEvent["resource"];
  const r = e.resource;
  if (r?.type === "document") {
    resource = { type: "doc", title: r.title };
  } else if (r?.type === "task") {
    resource = { type: "task", title: r.title };
  }
  return {
    id: e.id,
    actor: { id: e.actor.id, fullName: e.actor.fullName },
    action,
    resource,
    workspaceName,
    createdAt: e.createdAt,
  };
}

export async function getDashboardActivity(): Promise<DashboardActivityEvent[]> {
  const rows = await listMineWorkspaceRows();
  const merged: DashboardActivityEvent[] = [];
  for (const row of rows.slice(0, 5)) {
    try {
      const page = await fetchWorkspaceActivityPaginated(row.workspace.id, { page: 1, pageSize: 10 });
      for (const e of page.data.items) {
        const mapped = mapApiActivityToDashboard(e, row.workspace.name);
        if (mapped) merged.push(mapped);
      }
    } catch {
      continue;
    }
  }
  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return merged.slice(0, 16);
}
