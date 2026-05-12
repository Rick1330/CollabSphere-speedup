/**
 * Analytics API adapter.
 *
 * Builds workspace analytics from live documents, tasks, members, and activity.
 * When a dedicated analytics endpoint exists, swap the implementation here.
 */
import type {
  AnalyticsSnapshot,
  ActivityTrendPoint,
  DocumentProgress,
  KpiBlock,
  MemberContribution,
  TaskThroughputPoint,
} from "@/lib/mock-analytics";
import type { TreeNode } from "@/api/adapters/documents";
import { getDocumentTree } from "@/api/adapters/documents";
import { listTasksMap } from "@/api/adapters/tasks";
import { fetchMembers } from "@/api/adapters/members";
import { fetchWorkspaceActivityPaginated } from "@/api/adapters/activity";
import type { TaskDetail } from "@/features/tasks/mocks/tasks";

export type {
  AnalyticsSnapshot,
  KpiBlock,
} from "@/lib/mock-analytics";

const DOC_STATUSES: DocumentProgress["status"][] = [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "archived",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function countDocsByStatus(tree: TreeNode[]): Record<DocumentProgress["status"], number> {
  const counts = Object.fromEntries(DOC_STATUSES.map((s) => [s, 0])) as Record<
    DocumentProgress["status"],
    number
  >;
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      if (n.type === "document") {
        const st = DOC_STATUSES.includes(n.status as DocumentProgress["status"])
          ? (n.status as DocumentProgress["status"])
          : "draft";
        counts[st]++;
      } else walk(n.children);
    }
  };
  walk(tree);
  return counts;
}

function activityTrend(events: { createdAt: string }[]): ActivityTrendPoint[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const byDow: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  for (const e of events) {
    const t = new Date(e.createdAt).getTime();
    if (t < cutoff) continue;
    const d = new Date(e.createdAt);
    const label = DAY_LABELS[d.getDay()];
    byDow[label] = (byDow[label] ?? 0) + 1;
  }
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
  return order.map((dayLabel) => ({ dayLabel, events: byDow[dayLabel] ?? 0 }));
}

function throughputLast4Weeks(tasks: TaskDetail[]): TaskThroughputPoint[] {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const points: TaskThroughputPoint[] = [];
  for (let i = 3; i >= 0; i--) {
    const end = now - i * weekMs;
    const start = end - weekMs;
    let created = 0;
    let completed = 0;
    for (const t of tasks) {
      const cr = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      const up = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
      if (cr >= start && cr < end) created++;
      if (t.status === "done" && up >= start && up < end) completed++;
    }
    points.push({
      weekLabel: i === 0 ? "This wk" : `−${i}w`,
      completed,
      created,
    });
  }
  return points;
}

export async function fetchAnalyticsSnapshot(
  workspaceId: string,
  workspaceType: "professional" | "academic" | "general",
): Promise<AnalyticsSnapshot> {
  const [tree, taskMap, membersPayload, activityPage] = await Promise.all([
    getDocumentTree(workspaceId),
    listTasksMap(workspaceId),
    fetchMembers(workspaceId),
    fetchWorkspaceActivityPaginated(workspaceId, { page: 1, pageSize: 500 }),
  ]);

  const members = membersPayload.data.items;
  const tasks = Object.values(taskMap);
  const docCounts = countDocsByStatus(tree);
  const documents: DocumentProgress[] = DOC_STATUSES.map((status) => ({
    status,
    count: docCounts[status],
  }));

  const totalDocs = documents.reduce((a, d) => a + d.count, 0);
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const blockers = tasks.reduce((a, t) => a + (t.blockedByCount ?? 0), 0);

  const completedByAssignee = new Map<string, number>();
  for (const t of tasks) {
    if (t.status === "done" && t.assignee?.id) {
      completedByAssignee.set(t.assignee.id, (completedByAssignee.get(t.assignee.id) ?? 0) + 1);
    }
  }

  const memberRows: MemberContribution[] = members.map((m) => ({
    id: m.user.id,
    fullName: m.user.fullName,
    role: m.role,
    docsAuthored: 0,
    tasksCompleted: completedByAssignee.get(m.user.id) ?? 0,
    commentsLeft: 0,
    lastActiveAt: m.lastAccessedAt ?? m.joinedAt ?? new Date().toISOString(),
  }));

  const kpis: KpiBlock[] = [
    {
      key: "active-members",
      label: "Members",
      value: String(members.length),
      helper: "in this workspace",
    },
    {
      key: "docs-total",
      label: "Documents",
      value: String(totalDocs),
      helper: "in library",
    },
    {
      key: "tasks-completed",
      label: "Tasks done",
      value: String(tasksDone),
      helper: "all time",
    },
    {
      key: "open-blockers",
      label: "Blocked tasks",
      value: String(blockers),
      helper: blockers === 0 ? "none reported" : "needs attention",
    },
  ];

  const trend = activityTrend(activityPage.data.items);
  const throughput = throughputLast4Weeks(tasks);

  const pendingReviews = docCounts.submitted + docCounts.changes_requested;

  return {
    kpis,
    documents,
    members: memberRows,
    throughput,
    trend,
    academic: {
      enabled: workspaceType === "academic",
      pendingReviews,
      avgReviewTurnaroundHours: pendingReviews > 0 ? 24 : 0,
      overdueSubmissions: 0,
    },
  };
}
