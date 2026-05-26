/**
 * Documents API adapter.
 *
 * Canonical surface for the document tree, version history, and the
 * shared types those features need (TreeNode, DocumentVersion,
 * REASON_META). Components MUST import from this module instead of
 * reaching into `@/features/documents/mocks/*` directly.
 */
import { request } from "@/api/client";
import { parseApiListEnvelope, parseApiSingleEnvelope } from "@/api/client/envelope";
import { decodeYjsState } from "@/features/documents/lib/decode-yjs-state";
import type {
  TreeNode,
  TreeFolderNode,
  TreeDocumentNode,
} from "@/features/documents/components/document-tree-types";

export type { TreeNode, TreeFolderNode, TreeDocumentNode };
export { buildTree } from "@/features/documents/components/document-tree-build";

export type VersionReason = "manual" | "auto" | "submitted" | "approved" | "before_restore";
export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  reason: VersionReason;
  createdAt: string;
  createdById: string;
  createdByName: string;
  versionLabel?: string;
  contentExcerpt: string;
  note?: string;
  charCount: number;
  /** Character delta vs the next newer version (positive = more text than older). */
  wordDelta?: number | null;
  isLatest?: boolean;
}

export type DocumentVersionDetail = DocumentVersion & {
  yjsState: Uint8Array;
  plaintext?: string;
};

type ApiVersionListItem = {
  id: string;
  documentId?: string;
  versionNumber: number;
  reason: VersionReason;
  createdAt: string;
  createdById: string;
  createdBy?: { id: string; fullName?: string } | null;
  versionLabel?: string | null;
  note?: string | null;
  contentExcerpt?: string | null;
  charCount?: number | null;
  plaintext?: string | null;
};

type ApiVersionDetail = ApiVersionListItem & {
  yjsState?: unknown;
  yjsStateBase64?: string | null;
  versionYjsState?: unknown;
};

const VERSION_REASONS = new Set<VersionReason>([
  "manual",
  "auto",
  "submitted",
  "approved",
  "before_restore",
]);

function normalizeVersionReason(reason: string): VersionReason {
  if (VERSION_REASONS.has(reason as VersionReason)) {
    return reason as VersionReason;
  }
  if (reason === "collab_sync") {
    return "auto";
  }
  return "auto";
}

function parseVersionListPayload(payload: unknown): ApiVersionListItem[] {
  const parsed = parseApiListEnvelope<ApiVersionListItem>(payload);
  if (parsed.items.length > 0) {
    return parsed.items;
  }

  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return [];
  }

  const data = (payload as { data?: Record<string, unknown> }).data;
  if (!data) return [];

  const resource = data.resource;
  if (resource && typeof resource === "object") {
    const items = (resource as { items?: unknown; versions?: unknown }).items;
    if (Array.isArray(items)) return items as ApiVersionListItem[];
    const versions = (resource as { versions?: unknown }).versions;
    if (Array.isArray(versions)) return versions as ApiVersionListItem[];
  }

  const versions = data.versions;
  if (Array.isArray(versions)) return versions as ApiVersionListItem[];

  return [];
}

function mapApiVersionItem(
  item: ApiVersionListItem,
  documentId: string,
): DocumentVersion {
  const legacyName = (item as ApiVersionListItem & { createdByName?: string }).createdByName;
  const createdByName =
    item.createdBy?.fullName?.trim() ||
    (typeof legacyName === "string" ? legacyName.trim() : "") ||
    "Unknown";
  return {
    id: item.id,
    documentId: item.documentId ?? documentId,
    versionNumber: item.versionNumber,
    reason: normalizeVersionReason(String(item.reason)),
    createdAt: item.createdAt,
    createdById: item.createdById,
    createdByName,
    versionLabel: item.versionLabel ?? undefined,
    contentExcerpt: item.contentExcerpt?.trim() ?? item.plaintext?.slice(0, 120) ?? "",
    note: item.note ?? undefined,
    charCount: typeof item.charCount === "number" ? item.charCount : 0,
  };
}

function enrichVersionList(versions: DocumentVersion[]): DocumentVersion[] {
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return sorted.map((version, index) => {
    const newer = sorted[index + 1];
    let wordDelta: number | null = null;
    if (newer) {
      if (version.charCount > 0 || newer.charCount > 0) {
        wordDelta = version.charCount - newer.charCount;
      } else {
        wordDelta = 0;
      }
    }
    return {
      ...version,
      isLatest: index === 0,
      wordDelta,
    };
  });
}

export const REASON_META: Record<
  VersionReason,
  { label: string; tone: "neutral" | "amber" | "emerald" | "blue" | "stone"; description: string }
> = {
  manual: {
    label: "Manual save",
    tone: "blue",
    description: "Captured when the author saved with cmd+s.",
  },
  auto: {
    label: "Auto-save",
    tone: "neutral",
    description: "Captured automatically while editing.",
  },
  submitted: {
    label: "Submitted",
    tone: "amber",
    description: "Captured at the moment of submission for review.",
  },
  approved: {
    label: "Approved",
    tone: "emerald",
    description: "Captured at the moment of reviewer approval.",
  },
  before_restore: {
    label: "Safety snapshot",
    tone: "stone",
    description: "Captured automatically before restoring a previous version.",
  },
};

/**
 * Removed in Phase 2: tree now comes from live API.
 */
export const SEED_DOCUMENT_TREE: TreeNode[] = [];

// ---------- Async data surface ----------

type ListEnvelope<T> = { data?: { items?: T[]; total?: number } };

type ApiFolder = {
  id: string;
  name: string;
  parentId?: string | null;
  position?: number;
};

type ApiDocument = {
  id: string;
  title: string;
  folderId?: string | null;
  status: TreeDocumentNode["status"];
  isLocked?: boolean;
  updatedAt: string;
};

import { buildTree } from "@/features/documents/components/document-tree-build";

export async function getDocumentTree(workspaceId: string): Promise<TreeNode[]> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}/documents/tree`);
  const data = parseApiSingleEnvelope<{ folders?: ApiFolder[]; documents?: ApiDocument[] }>(payload);
  const folders = data.folders ?? [];
  const documents = data.documents ?? [];
  return buildTree(folders, documents);
}

export type WorkspaceDocumentDetail = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  title: string;
  status: TreeDocumentNode["status"];
  templateId: string | null;
  templateVersion: number | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  lockedByUser: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string };
  folder: { name: string } | null;
};

export async function fetchWorkspaceDocument(
  workspaceId: string,
  documentId: string,
): Promise<WorkspaceDocumentDetail> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}/documents/${documentId}`);
  const res = parseApiSingleEnvelope<{ document?: WorkspaceDocumentDetail }>(payload);
  if (!res.document?.id) {
    throw new Error("Document response is missing document.");
  }
  return res.document;
}

export async function updateDocumentMetadata(
  workspaceId: string,
  documentId: string,
  input: { title?: string; folderId?: string | null },
): Promise<WorkspaceDocumentDetail> {
  const body: { title?: string; folderId?: string | null } = {};
  if (input.title !== undefined) body.title = input.title.trim();
  if (input.folderId !== undefined) body.folderId = input.folderId;

  const payload = await request<unknown>(
    `/workspaces/${workspaceId}/documents/${documentId}`,
    { method: "PUT", body },
  );
  const res = parseApiSingleEnvelope<{ document?: WorkspaceDocumentDetail }>(payload);
  if (!res.document?.id) {
    throw new Error("Document update response is missing document.");
  }
  return res.document;
}

export async function createDocument(
  workspaceId: string,
  input: { title: string; folderId?: string | null; templateId?: string | null },
): Promise<WorkspaceDocumentDetail> {
  const body: { title: string; folderId?: string | null; templateId?: string | null } = {
    title: input.title,
  };
  if (input.folderId) body.folderId = input.folderId;
  if (input.templateId) body.templateId = input.templateId;

  const payload = await request<unknown>(`/workspaces/${workspaceId}/documents`, {
    method: "POST",
    body,
  });
  const res = parseApiSingleEnvelope<{ document?: WorkspaceDocumentDetail }>(payload);
  if (!res.document?.id) {
    throw new Error("Document creation response is missing document.");
  }
  return res.document;
}

export async function updateWorkspaceFolder(
  workspaceId: string,
  folderId: string,
  input: { name?: string; parentId?: string | null },
): Promise<{ id: string; name: string; parentId: string | null }> {
  const body: { name?: string; parentId?: string | null } = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.parentId !== undefined) body.parentId = input.parentId;

  const payload = await request<unknown>(`/workspaces/${workspaceId}/folders/${folderId}`, {
    method: "PATCH",
    body,
  });
  const res = parseApiSingleEnvelope<{
    folder?: { id: string; name: string; parentId: string | null };
  }>(payload);
  if (!res.folder?.id) {
    throw new Error("Folder update response is missing folder.");
  }
  return res.folder;
}

export async function deleteWorkspaceFolder(
  workspaceId: string,
  folderId: string,
): Promise<void> {
  await request<unknown>(`/workspaces/${workspaceId}/folders/${folderId}`, {
    method: "DELETE",
  });
}

export async function deleteDocument(
  workspaceId: string,
  documentId: string,
): Promise<void> {
  await request<unknown>(`/workspaces/${workspaceId}/documents/${documentId}`, {
    method: "DELETE",
  });
}

export async function createWorkspaceFolder(
  workspaceId: string,
  input: { name: string; parentId?: string | null },
): Promise<{ id: string; name: string; parentId: string | null }> {
  const body: { name: string; parentId?: string | null } = {
    name: input.name.trim(),
  };
  if (input.parentId) {
    body.parentId = input.parentId;
  }
  const payload = await request<unknown>(`/workspaces/${workspaceId}/folders`, {
    method: "POST",
    body,
  });
  const res = parseApiSingleEnvelope<{
    folder?: { id: string; name: string; parentId: string | null };
  }>(payload);
  if (!res.folder?.id) {
    throw new Error("Folder creation response is missing folder.");
  }
  return res.folder;
}

/** Flatten documents from tree for “recent docs” lists (newest first). */
export function collectDocumentsFromTree(
  tree: TreeNode[],
  limit = 12,
): Array<{
  id: string;
  title: string;
  folderPath: string;
  updatedAt: string;
  status: TreeDocumentNode["status"];
  isLocked?: boolean;
  lockedBy?: { fullName: string };
}> {
  const rows: Array<{
    id: string;
    title: string;
    folderPath: string;
    updatedAt: string;
    status: TreeDocumentNode["status"];
    isLocked?: boolean;
    lockedBy?: { fullName: string };
  }> = [];
  const walk = (nodes: TreeNode[], path: string[]) => {
    for (const n of nodes) {
      if (n.type === "folder") {
        walk(n.children, [...path, n.name]);
        continue;
      }
      rows.push({
        id: n.id,
        title: n.title,
        folderPath: path.length ? path.join(" / ") : "Root",
        updatedAt: n.updatedAt,
        status: n.status,
        isLocked: n.isLocked,
        lockedBy: n.lockedBy,
      });
    }
  };
  walk(tree, []);
  rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return rows.slice(0, limit);
}

export async function listDocumentVersions(
  workspaceId: string,
  documentId: string,
): Promise<DocumentVersion[]> {
  const payload = await request<unknown>(
    `/workspaces/${workspaceId}/documents/${documentId}/versions`,
  );
  const items = parseVersionListPayload(payload);
  if (import.meta.env.DEV) {
    const { total } = parseApiListEnvelope<ApiVersionListItem>(payload);
    console.info("[versions] list loaded", { documentId, count: items.length, total });
  }
  return enrichVersionList(items.map((item) => mapApiVersionItem(item, documentId)));
}

export async function getDocumentVersionDetail(
  workspaceId: string,
  documentId: string,
  versionId: string,
): Promise<DocumentVersionDetail> {
  const payload = await request<unknown>(
    `/workspaces/${workspaceId}/documents/${documentId}/versions/${versionId}`,
  );
  const res = parseApiSingleEnvelope<{ version?: ApiVersionDetail }>(payload);
  const version = res.version;
  if (!version?.id) {
    throw new Error("Version detail response is missing version.");
  }
  const base = mapApiVersionItem(version, documentId);
  const rawState =
    version.yjsStateBase64 ??
    version.yjsState ??
    version.versionYjsState;
  const yjsState = decodeYjsState(rawState);
  if (import.meta.env.DEV) {
    console.info("[versions] detail loaded", {
      versionId,
      yjsStateBytes: yjsState.byteLength,
      charCount: base.charCount,
    });
  }
  return {
    ...base,
    yjsState,
    plaintext: version.plaintext?.trim() || undefined,
  };
}

export async function createDocumentVersion(
  workspaceId: string,
  documentId: string,
  options?: { versionLabel?: string },
): Promise<DocumentVersion> {
  const payload = await request<unknown>(
    `/workspaces/${workspaceId}/documents/${documentId}/versions`,
    {
      method: "POST",
      body: options?.versionLabel ? { versionLabel: options.versionLabel.trim() } : {},
    },
  );
  const res = parseApiSingleEnvelope<{ version?: ApiVersionListItem }>(payload);
  if (!res.version?.id) {
    throw new Error("Version create response is missing version.");
  }
  return mapApiVersionItem(res.version, documentId);
}

export async function restoreDocumentVersion(
  workspaceId: string,
  documentId: string,
  versionId: string,
): Promise<void> {
  await request<unknown>(
    `/workspaces/${workspaceId}/documents/${documentId}/versions/${versionId}/restore`,
    { method: "POST" },
  );
}

export async function updateDocumentVersionLabel(
  workspaceId: string,
  documentId: string,
  versionId: string,
  label: string,
): Promise<DocumentVersion> {
  const payload = await request<unknown>(
    `/workspaces/${workspaceId}/documents/${documentId}/versions/${versionId}`,
    {
      method: "PATCH",
      body: { versionLabel: label.trim() },
    },
  );
  const res = parseApiSingleEnvelope<{ version?: ApiVersionListItem }>(payload);
  if (!res.version?.id) {
    throw new Error("Version update response is missing version.");
  }
  return mapApiVersionItem(res.version, documentId);
}

export function getVersionHistory(_documentId: string): DocumentVersion[] {
  return [];
}

/** Total document count derived from the tree — useful for header chips. */
export async function countDocuments(workspaceId: string): Promise<number> {
  const tree = await getDocumentTree(workspaceId);
  let count = 0;
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      if (n.type === "document") count++;
      else walk(n.children);
    }
  };
  walk(tree);
  return count;
}

/** Direct access to the in-memory version map for tests / debug only. */
export const __TEST_ONLY_VERSIONS: Record<string, DocumentVersion[]> = {};
