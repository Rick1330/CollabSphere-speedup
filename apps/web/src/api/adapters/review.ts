/**
 * Review-queue adapter (API-backed).
 *
 * Aggregates pending submissions across *academic* workspaces where the user
 * is allowed to review. This removes the mock review data and aligns the UI
 * with real workspace membership + backend submission workflow.
 */

import { request } from "@/api/client";
import { parseApiListEnvelope } from "@/api/client/envelope";
import { listMineWorkspaceRows } from "@/api/adapters/workspaces";
import { approveSubmission, fetchSubmissionHistory, requestSubmissionChanges } from "@/api/adapters/submissions";
import type { SubmissionRecord } from "@/lib/mock-academic";
import { canReviewAcademic, type WorkspaceType } from "@/lib/academic-capabilities";

export type ReviewDecision = "approved" | "changes_requested";

export interface ReviewItem {
  documentId: string;
  documentTitle: string;
  studentId: string;
  studentName: string;
  status: "submitted";
  lastEventAt: string;
  folderPath: string | null;
  /** Workspace this submission belongs to (so the queue can route correctly). */
  workspaceId: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
  /** Optional submission note from the student. */
  submissionNote?: string;
  /** Version label e.g. "v2". */
  versionLabel?: string;
}

export interface ReviewedItem extends ReviewItem {
  decision: ReviewDecision;
  decidedAt: string;
  decisionNote?: string;
}

export async function fetchReviewQueue(): Promise<{
  pending: ReviewItem[];
  reviewed: ReviewedItem[];
}> {
  const rows = await listMineWorkspaceRows();
  const reviewableAcademic = rows.filter((row) =>
    canReviewAcademic({ workspaceType: row.workspace.type, myRole: row.role }),
  );

  const pending = (
    await Promise.all(
      reviewableAcademic.map(async (row) => {
        const payload = await request<unknown>(`/workspaces/${row.workspace.id}/submissions/queue`);
        const { items } = parseApiListEnvelope<{
          id: string;
          documentId: string;
          submittedAt: string;
          submittedById: string;
          submittedBy?: { id: string; fullName?: string | null } | null;
          document?: { id: string; title?: string | null; status?: string | null } | null;
        }>(payload);

        return items.map(
          (item): ReviewItem => ({
            documentId: item.documentId,
            documentTitle: item.document?.title?.trim() || "Untitled",
            studentId: item.submittedById,
            studentName: item.submittedBy?.fullName?.trim() || "Student",
            status: "submitted",
            lastEventAt: item.submittedAt,
            folderPath: null,
            workspaceId: row.workspace.id,
            workspaceName: row.workspace.name,
            workspaceType: row.workspace.type,
            submissionNote: undefined,
            versionLabel: undefined,
          }),
        );
      }),
    )
  ).flat();

  pending.sort((a, b) => new Date(b.lastEventAt).getTime() - new Date(a.lastEventAt).getTime());

  // Reviewed history is not yet exposed as a cross-workspace feed by the API.
  return { pending, reviewed: [] };
}

export async function decideOnSubmission(params: {
  workspaceId: string;
  documentId: string;
  decision: ReviewDecision;
  note?: string;
}): Promise<void> {
  if (params.decision === "approved") {
    await approveSubmission({ workspaceId: params.workspaceId, documentId: params.documentId });
    return;
  }
  const note = params.note?.trim() ?? "";
  if (!note) {
    throw new Error("A feedback note is required when requesting changes.");
  }
  await requestSubmissionChanges({
    workspaceId: params.workspaceId,
    documentId: params.documentId,
    note,
  });
}

export async function fetchDocumentHistory(params: {
  workspaceId: string;
  documentId: string;
}): Promise<SubmissionRecord[]> {
  return fetchSubmissionHistory(params);
}

export async function fetchReviewCounts(): Promise<{
  pendingTotal: number;
  overdueTotal: number;
  decidedToday: number;
}> {
  const { pending } = await fetchReviewQueue();
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  return {
    pendingTotal: pending.length,
    overdueTotal: pending.filter((p) => now - new Date(p.lastEventAt).getTime() > dayMs).length,
    decidedToday: 0,
  };
}

export async function fetchMySubmissions(_accountId: string): Promise<{
  pending: ReviewItem[];
  reviewed: ReviewedItem[];
}> {
  // The backend does not currently expose a per-user submissions feed. Keep this
  // surface stable for the dashboard panel; we can wire it once the API exists.
  void _accountId;
  return { pending: [], reviewed: [] };
}
