import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronDown, Clock3, Loader2, MessageSquareText, Send } from "lucide-react";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceMobileNav } from "@/features/workspace/components/workspace-mobile-nav";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useCurrentAccount } from "@/lib/auth-session";
import { canSubmitAcademic } from "@/lib/academic-capabilities";
import { collectDocumentsFromTree, getDocumentTree } from "@/api/adapters/documents";
import { fetchSubmissionHistory } from "@/api/adapters/submissions";
import { fetchDocumentCommentThreads } from "@/api/adapters/comments";
import { fullDateTime, relativeTime } from "@/lib/format";

type SubmissionCenterItem = {
  documentId: string;
  title: string;
  status: string;
  history: Array<{
    id: string;
    submittedAt: string;
    submittedByName: string;
    decision: "approved" | "changes_requested" | null;
    decidedAt: string | null;
    decidedByName: string | null;
    decisionNote: string | null;
  }>;
  lastSubmittedAt: string | null;
  lastDecisionAt: string | null;
  lastDecision: "approved" | "changes_requested" | null;
  lastDecisionNote: string | null;
  unresolvedComments: number;
  resolvedComments: number;
  totalComments: number;
};

const SubmissionCenterPage = () => {
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const account = useCurrentAccount();
  const { workspaceId, sidebar, myRole, isLoading, isError } = useWorkspaceRouteContext();

  const canAccess = canSubmitAcademic({
    workspaceType: sidebar?.type,
    myRole: myRole ?? null,
    canCreateContent: sidebar?.permissions.canCreateContent,
  });

  const centerQ = useQuery({
    queryKey: ["workspace", workspaceId, "submission-center"],
    enabled: Boolean(workspaceId && sidebar?.type === "academic" && canAccess),
    queryFn: async (): Promise<SubmissionCenterItem[]> => {
      const tree = await getDocumentTree(workspaceId);
      const docs = collectDocumentsFromTree(tree);
      const rows = await Promise.all(
        docs.map(async (doc) => {
          const [history, threads] = await Promise.all([
            fetchSubmissionHistory({ workspaceId, documentId: doc.id }),
            fetchDocumentCommentThreads({ workspaceId, documentId: doc.id }),
          ]);
          const newestFirst = [...history].sort(
            (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
          );
          const lastSubmission = newestFirst[0] ?? null;
          const lastDecision = newestFirst.find((h) => h.decision != null) ?? null;
          const unresolvedComments = threads.filter((t) => t.status === "open").length;
          const resolvedComments = threads.filter((t) => t.status === "resolved").length;
          return {
            documentId: doc.id,
            title: doc.title,
            status: doc.status,
            history: newestFirst.map((h) => ({
              id: h.id,
              submittedAt: h.submittedAt,
              submittedByName: h.submittedByName,
              decision: h.decision,
              decidedAt: h.decidedAt,
              decidedByName: h.decidedByName ?? null,
              decisionNote: h.decisionNote ?? null,
            })),
            lastSubmittedAt: lastSubmission?.submittedAt ?? null,
            lastDecisionAt: lastDecision?.decidedAt ?? null,
            lastDecision: lastDecision?.decision ?? null,
            lastDecisionNote: lastDecision?.decisionNote ?? null,
            unresolvedComments,
            resolvedComments,
            totalComments: threads.length,
          };
        }),
      );
      return rows
        .filter((r) => r.lastSubmittedAt != null || r.status !== "draft")
        .sort((a, b) => {
          const at = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0;
          const bt = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0;
          return bt - at;
        });
    },
    staleTime: 20_000,
  });

  const user = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  const activeCount = useMemo(
    () =>
      (centerQ.data ?? []).filter(
        (r) => r.status === "submitted" || r.status === "changes_requested",
      ).length,
    [centerQ.data],
  );

  // (Not stateful) kept here only if we later want to remember expanded items across renders.
  if (!isLoading && (isError || !sidebar || !myRole || !canAccess)) {
    return <Navigate to={workspaceId ? `/w/${workspaceId}` : "/dashboard"} replace />;
  }

  return (
    <div className="app-light min-h-screen flex">
      {sidebar ? <WorkspaceSidebar workspace={sidebar} collapsed={collapsed} onToggle={toggle} /> : null}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav user={user} onOpenPalette={palette.toggle} />
        {sidebar ? <WorkspaceMobileNav workspace={sidebar} /> : null}

        <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto w-full">
          <header className="mb-6">
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-amber-700 font-semibold inline-flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Submission center
            </p>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">
              Submission and review status
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Track your review cycle in real-time, including decisions and comment thread resolution.
            </p>
            <div className="mt-3 text-xs text-stone-600 inline-flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5 text-amber-600" />
              <strong className="font-mono tabular-nums text-stone-900">{activeCount}</strong>
              active submissions
            </div>
          </header>

          {centerQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading submissions…
            </div>
          ) : centerQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load submission center data.
            </div>
          ) : (centerQ.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
              No submission records yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {(centerQ.data ?? []).map((item) => (
                <li key={item.documentId} className="rounded-xl border border-stone-200 bg-white p-4">
                  <details className="group">
                    <summary className="list-none cursor-pointer">
                      <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/w/${workspaceId}/documents/${item.documentId}`}
                        className="font-semibold text-stone-900 hover:text-teal-700"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-stone-500 mt-1">
                        Status: <span className="font-medium text-stone-700">{item.status}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                    {item.lastDecision === "approved" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approved
                      </span>
                    ) : item.lastDecision === "changes_requested" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Changes requested
                      </span>
                    ) : null}
                      <ChevronDown className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-stone-600 sm:grid-cols-3">
                    <div>
                      <span className="text-stone-500">Submitted:</span>{" "}
                      {item.lastSubmittedAt ? (
                        <time dateTime={item.lastSubmittedAt} title={fullDateTime(item.lastSubmittedAt)}>
                          {relativeTime(item.lastSubmittedAt)}
                        </time>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div>
                      <span className="text-stone-500">Last decision:</span>{" "}
                      {item.lastDecisionAt ? (
                        <time dateTime={item.lastDecisionAt} title={fullDateTime(item.lastDecisionAt)}>
                          {relativeTime(item.lastDecisionAt)}
                        </time>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <MessageSquareText className="h-3.5 w-3.5 text-stone-500" />
                      <span>
                        {item.unresolvedComments} unresolved / {item.resolvedComments} resolved
                      </span>
                    </div>
                  </div>
                  {item.lastDecisionNote ? (
                    <p className="mt-2 rounded-md bg-stone-50 px-2 py-1.5 text-xs text-stone-700">
                      Reviewer note: {item.lastDecisionNote}
                    </p>
                  ) : null}
                    </summary>

                    <div className="mt-3 border-t border-stone-200 pt-3">
                      <div className="text-[11px] font-mono tracking-[0.18em] uppercase text-stone-400 mb-2">
                        Decision history
                      </div>
                      {item.history.length === 0 ? (
                        <p className="text-xs text-stone-500">No submission history.</p>
                      ) : (
                        <ol className="space-y-2">
                          {item.history.map((h) => (
                            <li key={h.id} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs text-stone-700">
                                  <span className="font-semibold">{h.submittedByName}</span>{" "}
                                  submitted{" "}
                                  <time dateTime={h.submittedAt} title={fullDateTime(h.submittedAt)} className="text-stone-600">
                                    {relativeTime(h.submittedAt)}
                                  </time>
                                </div>
                                {h.decision === "approved" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Approved
                                  </span>
                                ) : h.decision === "changes_requested" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Changes requested
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-medium text-stone-500">Pending</span>
                                )}
                              </div>
                              {h.decidedAt ? (
                                <div className="mt-1 text-[11px] text-stone-600">
                                  Decision by{" "}
                                  <span className="font-medium text-stone-700">{h.decidedByName ?? "Reviewer"}</span>{" "}
                                  <time dateTime={h.decidedAt} title={fullDateTime(h.decidedAt)}>
                                    {relativeTime(h.decidedAt)}
                                  </time>
                                </div>
                              ) : null}
                              {h.decisionNote ? (
                                <p className="mt-2 text-xs text-stone-700 whitespace-pre-wrap">
                                  {h.decisionNote}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default SubmissionCenterPage;
