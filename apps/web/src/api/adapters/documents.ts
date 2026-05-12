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
} from "@/features/documents/components/document-tree";

export type { TreeNode, TreeFolderNode, TreeDocumentNode };

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

function buildTree(folders: ApiFolder[], documents: ApiDocument[]): TreeNode[] {
  const folderNodes = new Map<string, TreeFolderNode>();
  for (const folder of folders) {
    folderNodes.set(folder.id, {
      type: "folder",
      id: folder.id,
      name: folder.name,
      children: [],
    });
  }
  const root: TreeNode[] = [];
  for (const folder of folders) {
    const node = folderNodes.get(folder.id);
    if (!node) continue;
    if (folder.parentId && folderNodes.has(folder.parentId)) {
      folderNodes.get(folder.parentId)?.children.push(node);
    } else {
      root.push(node);
    }
  }
  for (const document of documents) {
    const docNode: TreeDocumentNode = {
      type: "document",
      id: document.id,
      title: document.title,
      status: document.status,
      isLocked: Boolean(document.isLocked),
      updatedAt: document.updatedAt,
    };
    if (document.folderId && folderNodes.has(document.folderId)) {
      folderNodes.get(document.folderId)?.children.push(docNode);
    } else {
      root.push(docNode);
    }
  }
  return root;
}

export async function getDocumentTree(workspaceId: string): Promise<TreeNode[]> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}/documents/tree`);
  const data = parseApiSingleEnvelope<{ folders?: ApiFolder[]; documents?: ApiDocument[] }>(payload);
  const folders = data.folders ?? [];
  const documents = data.documents ?? [];
  return buildTree(folders, documents);
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
