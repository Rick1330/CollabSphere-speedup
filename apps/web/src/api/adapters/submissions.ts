/**
 * Academic submissions (API-backed).
 *
 * This adapter powers the editor's submit/review panels against the Nest API.
 */
import { request } from "@/api/client";
import { parseApiListEnvelope } from "@/api/client/envelope";
import type { SubmissionRecord } from "@/lib/mock-academic";

export type ReviewDecision = "approved" | "changes_requested";

export async function submitDocumentForReview(params: {
  workspaceId: string;
  documentId: string;
}): Promise<void> {
  await request<unknown>(
    `/workspaces/${params.workspaceId}/documents/${params.documentId}/submit`,
    { method: "POST" },
  );
}

export async function approveSubmission(params: {
  workspaceId: string;
  documentId: string;
}): Promise<void> {
  await request<unknown>(
    `/workspaces/${params.workspaceId}/documents/${params.documentId}/approve`,
    { method: "POST" },
  );
}

export async function requestSubmissionChanges(params: {
  workspaceId: string;
  documentId: string;
  note: string;
}): Promise<void> {
  await request<unknown>(
    `/workspaces/${params.workspaceId}/documents/${params.documentId}/request-changes`,
    { method: "POST", body: { note: params.note } },
  );
}

type ApiSubmissionRow = {
  id: string;
  submittedAt: string;
  submittedById: string;
  submittedBy?: { id: string; fullName?: string | null } | null;
  decision: ReviewDecision | null;
  decidedAt: string | null;
  decidedById: string | null;
  decidedBy?: { id: string; fullName?: string | null } | null;
  decisionNote: string | null;
  snapshotVersionId: string | null;
};

export async function fetchSubmissionHistory(params: {
  workspaceId: string;
  documentId: string;
}): Promise<SubmissionRecord[]> {
  const payload = await request<unknown>(
    `/workspaces/${params.workspaceId}/documents/${params.documentId}/submissions`,
  );
  const { items } = parseApiListEnvelope<ApiSubmissionRow>(payload);
  return items.map((row) => ({
    id: row.id,
    documentId: params.documentId,
    submittedAt: row.submittedAt,
    submittedById: row.submittedById,
    submittedByName: row.submittedBy?.fullName?.trim() || "Unknown",
    decision: row.decision,
    decidedAt: row.decidedAt,
    decidedById: row.decidedById,
    decidedByName: row.decidedBy?.fullName?.trim() || (row.decidedById ? "Reviewer" : null),
    decisionNote: row.decisionNote,
    // Not yet persisted in API; keep null for now.
    submissionNote: null,
    versionLabel: null,
  }));
}

export async function validateForSubmission(params: {
  workspaceId: string;
  documentId: string;
}): Promise<{ errors: string[]; warnings: string[] }> {
  const payload = await request<unknown>(
    `/workspaces/${params.workspaceId}/documents/${params.documentId}/validate-for-submission`,
  );
  // `parseApiSingleEnvelope` isn't used here to avoid coupling; keep it simple.
  if (!payload || typeof payload !== "object") return { errors: [], warnings: [] };
  const data = (payload as { data?: unknown }).data;
  const resource = data && typeof data === "object" ? (data as { resource?: unknown }).resource : undefined;
  if (!resource || typeof resource !== "object") return { errors: [], warnings: [] };
  const errors = Array.isArray((resource as any).errors) ? ((resource as any).errors as string[]) : [];
  const warnings = Array.isArray((resource as any).warnings) ? ((resource as any).warnings as string[]) : [];
  return { errors, warnings };
}

