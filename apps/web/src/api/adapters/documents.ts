/**
 * Documents API adapter.
 *
 * Canonical surface for the document tree, version history, and the
 * shared types those features need (TreeNode, DocumentVersion,
 * REASON_META). Components MUST import from this module instead of
 * reaching into `@/features/documents/mocks/*` directly.
 */
import { request } from "@/api/client";
import { parseApiSingleEnvelope } from "@/api/client/envelope";
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
  contentPlaintext: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  lockedByUser: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string };
  folder: { name: string } | null;
};

/** Turn API plaintext snapshot into safe HTML for TipTap when Yjs/HTML body is not loaded yet. */
export function plaintextToEditorHtml(text: string): string {
  const raw = text.trim();
  if (!raw) return "<p></p>";
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n\n+/)
    .filter(Boolean)
    .map((chunk) => `<p>${chunk.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

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
  const payload = await request<ListEnvelope<Omit<DocumentVersion, "createdByName" | "contentExcerpt" | "charCount">>>(
    `/workspaces/${workspaceId}/documents/${documentId}/versions`,
  );
  const items = payload.data?.items ?? [];
  return items.map((item) => ({
    ...item,
    documentId,
    createdByName: "Unknown",
    contentExcerpt: "",
    charCount: 0,
  }));
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
