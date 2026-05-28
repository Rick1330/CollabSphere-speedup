/**
 * Workspace task labels API adapter.
 */
import { request } from "@/api/client";
import { parseApiListEnvelope, parseApiSingleEnvelope } from "@/api/client/envelope";
import {
  getLabelClasses as mockGetLabelClasses,
  getLabelName as mockGetLabelName,
  type WorkspaceLabel,
} from "@/features/tasks/mocks/labels";

export type { WorkspaceLabel };

type ApiTaskLabel = {
  id: string;
  name: string;
  color: string;
  description?: string | null;
};

const TONES: WorkspaceLabel["tone"][] = [
  "teal",
  "indigo",
  "amber",
  "rose",
  "emerald",
  "stone",
  "violet",
  "sky",
];

function toneFromColor(color: string, name: string): WorkspaceLabel["tone"] {
  const hex = color.trim().toLowerCase();
  if (hex.startsWith("#7c3aed") || hex.startsWith("#8b5cf6")) return "violet";
  if (hex.startsWith("#0284c7") || hex.startsWith("#0ea5e9")) return "sky";
  if (hex.startsWith("#059669") || hex.startsWith("#10b981")) return "emerald";
  if (hex.startsWith("#d97706") || hex.startsWith("#f59e0b")) return "amber";
  if (hex.startsWith("#dc2626") || hex.startsWith("#ef4444")) return "rose";
  if (hex.startsWith("#64748b") || hex.startsWith("#9ca3af")) return "stone";
  let acc = 0;
  for (const ch of name) acc += ch.charCodeAt(0);
  return TONES[acc % TONES.length];
}

function mapApiLabel(row: ApiTaskLabel): WorkspaceLabel {
  const name = row.name.trim();
  return {
    value: name,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    tone: toneFromColor(row.color, name),
    description: row.description ?? undefined,
  };
}

const labelCache = new Map<string, WorkspaceLabel[]>();

export async function listWorkspaceLabels(workspaceId: string): Promise<WorkspaceLabel[]> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}/task-labels`);
  const { items } = parseApiListEnvelope<ApiTaskLabel>(payload);
  const mapped = items.map(mapApiLabel);
  labelCache.set(workspaceId, mapped);
  return mapped;
}

export async function createWorkspaceLabel(
  workspaceId: string,
  name: string,
): Promise<WorkspaceLabel | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const payload = await request<unknown>(`/workspaces/${workspaceId}/task-labels`, {
    method: "POST",
    body: { name: trimmed },
  });
  const resource = parseApiSingleEnvelope<{ label?: ApiTaskLabel }>(payload);
  if (!resource.label) return null;
  const mapped = mapApiLabel(resource.label);
  const cached = labelCache.get(workspaceId) ?? [];
  if (!cached.some((l) => l.value === mapped.value)) {
    labelCache.set(workspaceId, [...cached, mapped]);
  }
  return mapped;
}

/** Sync read for components that already hydrated the cache via React Query. */
export function getWorkspaceLabels(workspaceId: string): WorkspaceLabel[] {
  return labelCache.get(workspaceId) ?? [];
}

export function findLabel(workspaceId: string, value: string): WorkspaceLabel | undefined {
  return getWorkspaceLabels(workspaceId).find((l) => l.value === value);
}

const TONE_CLASSES: Record<WorkspaceLabel["tone"], string> = {
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
};

export function getLabelClasses(workspaceId: string, value: string): string {
  const label = findLabel(workspaceId, value);
  return TONE_CLASSES[label?.tone ?? "stone"];
}

export function getLabelName(workspaceId: string, value: string): string {
  return findLabel(workspaceId, value)?.name ?? mockGetLabelName(value);
}
