import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  MessageSquareWarning,
  FileText,
  ChevronRight,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime, fullDateTime, getInitials, getAvatarColor } from "@/lib/format";
import type { AcademicQueueItem } from "@/lib/mock-academic";
import { MOCK_ACADEMIC_PROGRESS } from "@/lib/mock-academic";
import { getDocumentTree, type TreeNode } from "@/api/adapters/documents";
import type { TreeDocumentNode } from "@/features/documents/components/document-tree";

interface WorkspaceAcademicProgressProps {
  workspaceId: string;
  /** True when the viewer is supervisor/owner/manager. */
  isSupervisorView: boolean;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isApiWorkspaceId(id: string) {
  return UUID_RE.test(id.trim());
}

function flattenDocuments(nodes: TreeNode[]): TreeDocumentNode[] {
  const out: TreeDocumentNode[] = [];
  const walk = (ns: TreeNode[]) => {
    for (const n of ns) {
      if (n.type === "document") out.push(n);
      else walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

function emptyLiveSnapshot(): ReturnType<typeof buildAcademicSnapshotFromDocs> {
  return {
    counts: { draft: 0, submitted: 0, changes_requested: 0, approved: 0 },
    awaitingReview: [],
    recentlyReviewed: [],
    studentsWithOpenCycles: [],
  };
}

function buildAcademicSnapshotFromDocs(
  docs: Array<{
    id: string;
    title: string;
    folderPath: string;
    updatedAt: string;
    status: TreeDocumentNode["status"];
  }>,
): {
  counts: { draft: number; submitted: number; changes_requested: number; approved: number };
  awaitingReview: AcademicQueueItem[];
  recentlyReviewed: AcademicQueueItem[];
  studentsWithOpenCycles: {
    studentId: string;
    studentName: string;
    openCount: number;
    lastEventAt: string;
  }[];
} {
  const counts = { draft: 0, submitted: 0, changes_requested: 0, approved: 0 };
  for (const d of docs) {
    if (d.status === "archived") continue;
    if (d.status in counts) counts[d.status as keyof typeof counts]++;
  }

  const toQueueItem = (row: (typeof docs)[0]): AcademicQueueItem => ({
    documentId: row.id,
    documentTitle: row.title,
    folderPath: row.folderPath,
    studentId: row.id,
    studentName: "Workspace collaborator",
    status: row.status as AcademicQueueItem["status"],
    lastEventAt: row.updatedAt,
  });

  const awaitingReview = docs
    .filter((d) => d.status === "submitted" || d.status === "changes_requested")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 12)
    .map((d) =>
      toQueueItem({
        ...d,
        status: d.status === "changes_requested" ? "changes_requested" : "submitted",
      }),
    );

  const recentlyReviewed = docs
    .filter((d) => d.status === "approved")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)
    .map((d) => toQueueItem({ ...d, status: "approved" }));

  return {
    counts,
    awaitingReview,
    recentlyReviewed,
    studentsWithOpenCycles: [],
  };
}

/**
 * Supervisor progress block for academic workspaces.
 * Shows: status counts strip + "Awaiting your review" queue + recently reviewed.
 *
 * For real API workspace UUIDs, data is derived from the live document tree.
 * Legacy non-UUID routes may still use the seeded mock snapshot.
 */
export const WorkspaceAcademicProgress = ({
  workspaceId,
  isSupervisorView,
}: WorkspaceAcademicProgressProps) => {
  const useLive = isApiWorkspaceId(workspaceId);

  const treeQuery = useQuery({
    queryKey: ["workspace-academic", workspaceId, "tree"],
    queryFn: () => getDocumentTree(workspaceId),
    enabled: useLive,
    staleTime: 15_000,
  });

  const liveSnapshot = useMemo(() => {
    if (!useLive || !treeQuery.data) return null;
    const flat = flattenDocuments(treeQuery.data);
    const rows = flat.map((d) => {
      const folderPath = findFolderPath(treeQuery.data, d.id);
      return {
        id: d.id,
        title: d.title,
        folderPath: folderPath ?? "Root",
        updatedAt: d.updatedAt,
        status: d.status,
      };
    });
    return buildAcademicSnapshotFromDocs(rows);
  }, [treeQuery.data, useLive]);

  const data = useLive ? (liveSnapshot ?? emptyLiveSnapshot()) : MOCK_ACADEMIC_PROGRESS;
  const base = `/w/${workspaceId}`;
  const VISIBLE_QUEUE = 5;
  const queue = data.awaitingReview.slice(0, VISIBLE_QUEUE);
  const overflow = Math.max(0, data.awaitingReview.length - VISIBLE_QUEUE);

  if (useLive && treeQuery.isPending) {
    return (
      <section aria-labelledby="academic-progress-heading" className="mt-10">
        <div className="flex items-center gap-2 text-sm text-stone-500 py-8" aria-busy="true">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading academic progress…
        </div>
      </section>
    );
  }

  if (useLive && treeQuery.isError) {
    return (
      <section aria-labelledby="academic-progress-heading" className="mt-10">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-sm text-red-800">
          Couldn’t load document status for this workspace.
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="academic-progress-heading"
      className="mt-10"
    >
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-amber-700 tracking-[0.22em] uppercase font-semibold inline-flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Academic
          </p>
          <h2
            id="academic-progress-heading"
            className="text-[15px] font-semibold text-stone-900 tracking-tight mt-1"
          >
            {isSupervisorView ? "Supervisor progress" : "Review activity"}
          </h2>
        </div>
        <Link
          to={`${base}/analytics`}
          className="text-[13px] font-medium text-teal-600 hover:text-teal-700 transition-colors inline-flex items-center gap-1 flex-shrink-0"
        >
          Full analytics
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Status counts — max 4 metrics in first strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <CountTile
          label="Draft"
          value={data.counts.draft}
          tone="stone"
          icon={FileText}
        />
        <CountTile
          label="Submitted"
          value={data.counts.submitted}
          tone="amber"
          icon={Clock}
          highlight={data.counts.submitted > 0 && isSupervisorView}
        />
        <CountTile
          label="Changes"
          value={data.counts.changes_requested}
          tone="red"
          icon={MessageSquareWarning}
        />
        <CountTile
          label="Approved"
          value={data.counts.approved}
          tone="emerald"
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Awaiting review queue */}
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-600 font-semibold">
                {isSupervisorView ? "Awaiting your review" : "Awaiting review"}
              </span>
              {data.awaitingReview.length > 0 && (
                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-amber-100 border border-amber-200 text-[10px] font-mono font-semibold text-amber-700 flex items-center justify-center tabular-nums">
                  {data.awaitingReview.length}
                </span>
              )}
            </div>
          </div>
          {queue.length === 0 ? (
            <div className="py-10 text-center">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-stone-900 mt-3">
                Nothing waiting
              </p>
              <p className="text-xs text-stone-500 mt-1">
                You're caught up on reviews.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {queue.map((item) => (
                <QueueRow key={item.documentId} item={item} base={base} />
              ))}
              {overflow > 0 && (
                <li className="px-4 py-2.5 text-center">
                  <Link
                    to={`${base}/documents?status=submitted`}
                    className="text-[12px] font-medium text-teal-700 hover:text-teal-800"
                  >
                    View all {data.awaitingReview.length} submissions →
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Recently reviewed + students with open cycles */}
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-600 font-semibold">
                Recently reviewed
              </span>
            </div>
            {data.recentlyReviewed.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-stone-500">
                No recent decisions.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {data.recentlyReviewed.slice(0, 3).map((item) => (
                  <QueueRow key={item.documentId} item={item} base={base} compact />
                ))}
              </ul>
            )}
          </div>

          {isSupervisorView && data.studentsWithOpenCycles.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-stone-500" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-600 font-semibold">
                  Students with open cycles
                </span>
              </div>
              <ul className="divide-y divide-stone-100">
                {data.studentsWithOpenCycles.slice(0, 4).map((s) => (
                  <li
                    key={s.studentId}
                    className="px-4 py-2.5 flex items-center justify-between gap-3"
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span
                        className="h-6 w-6 rounded-full text-[10px] font-semibold text-white inline-flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: getAvatarColor(s.studentId) }}
                      >
                        {getInitials(s.studentName, 1)}
                      </span>
                      <span className="text-[13px] font-medium text-stone-800 truncate">
                        {s.studentName}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-stone-500 tabular-nums tracking-wider flex-shrink-0">
                      {s.openCount} open ·{" "}
                      <time dateTime={s.lastEventAt} title={fullDateTime(s.lastEventAt)}>
                        {relativeTime(s.lastEventAt)}
                      </time>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

function findFolderPath(nodes: TreeNode[], documentId: string, trail: string[] = []): string | null {
  for (const n of nodes) {
    if (n.type === "folder") {
      const hit = findFolderPath(n.children, documentId, [...trail, n.name]);
      if (hit !== null) return hit;
    } else if (n.id === documentId) {
      return trail.length ? trail.join(" / ") : null;
    }
  }
  return null;
}

const CountTile = ({
  label,
  value,
  tone,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  tone: "stone" | "amber" | "red" | "emerald";
  icon: typeof FileText;
  highlight?: boolean;
}) => {
  const tones: Record<string, string> = {
    stone: "border-stone-200 bg-white",
    amber: "border-amber-200 bg-amber-50/50",
    red: "border-red-200 bg-red-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
  };
  const iconCls: Record<string, string> = {
    stone: "text-stone-400",
    amber: "text-amber-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
  };
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        tones[tone],
        highlight && "ring-1 ring-amber-300",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-stone-500">
          {label}
        </span>
        <Icon className={cn("h-3.5 w-3.5", iconCls[tone])} />
      </div>
      <div
        className="mt-1.5 text-[26px] tracking-tight text-stone-900 leading-none tabular-nums"
        style={{ fontFamily: "Georgia, 'Iowan Old Style', serif", fontWeight: 600 }}
      >
        {value}
      </div>
    </div>
  );
};

const QueueRow = ({
  item,
  base,
  compact,
}: {
  item: AcademicQueueItem;
  base: string;
  compact?: boolean;
}) => {
  const isOverdue =
    item.status === "submitted" &&
    Date.now() - new Date(item.lastEventAt).getTime() > 24 * 60 * 60 * 1000;

  const statusMeta =
    item.status === "approved"
      ? { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "APPROVED" }
      : item.status === "changes_requested"
      ? { cls: "bg-red-50 text-red-700 border-red-200", label: "CHANGES" }
      : item.status === "submitted"
      ? { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "SUBMITTED" }
      : { cls: "bg-stone-100 text-stone-600 border-stone-200", label: "DRAFT" };

  return (
    <li>
      <Link
        to={`${base}/documents/${item.documentId}`}
        className={cn(
          "flex items-center gap-3 px-4 hover:bg-stone-50 transition-colors group",
          compact ? "py-2.5" : "py-3",
        )}
      >
        <span
          className="h-8 w-8 rounded-full text-[10px] font-semibold text-white inline-flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: getAvatarColor(item.studentId) }}
          aria-hidden="true"
        >
          {getInitials(item.studentName, 1)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-stone-900 truncate group-hover:text-teal-700 transition-colors">
            {item.documentTitle}
          </p>
          <p className="text-[11.5px] text-stone-500 truncate mt-0.5">
            {item.studentName}
            {item.folderPath && <span className="text-stone-400"> · {item.folderPath}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={cn(
              "font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded border",
              statusMeta.cls,
            )}
          >
            {statusMeta.label}
          </span>
          <span
            className={cn(
              "font-mono text-[10px] tabular-nums tracking-wider inline-flex items-center gap-1",
              isOverdue ? "text-red-600 font-semibold" : "text-stone-400",
            )}
            title={fullDateTime(item.lastEventAt)}
          >
            {isOverdue && <AlertCircle className="h-3 w-3" />}
            {relativeTime(item.lastEventAt)}
          </span>
        </div>
      </Link>
    </li>
  );
};
