import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  Lock,
  FilePlus,
  FolderPlus,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime, fullDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  createDocument,
  createWorkspaceFolder,
  deleteDocument,
  deleteWorkspaceFolder,
  updateDocumentMetadata,
  updateWorkspaceFolder,
} from "@/api/adapters/documents";
import { ApiError } from "@/api/client";
import { filterTree } from "./document-tree-filter";
import { TreeCreateDialog } from "./tree-create-dialog";
import { TreeMoveDialog } from "./tree-move-dialog";
import { TreeDocumentRow, TreeFolderRow } from "./tree-rows";
import { DocumentShadcnFileTree } from "./tree/document-shadcn-file-tree";

type DocStatus = "draft" | "submitted" | "changes_requested" | "approved" | "archived";

export interface TreeDocumentNode {
  type: "document";
  id: string;
  title: string;
  status: DocStatus;
  isLocked?: boolean;
  lockedBy?: { fullName: string };
  updatedAt: string;
}

export interface TreeFolderNode {
  type: "folder";
  id: string;
  name: string;
  children: TreeNode[];
}

export type TreeNode = TreeFolderNode | TreeDocumentNode;

export type TreeContentPermissions = {
  canCreateContent: boolean;
  canOrganizeContent: boolean;
  canDeleteContent: boolean;
};

export type TreeRenderMode = "legacy" | "shadcn";

export interface WorkspaceDocumentTreeProps {
  variant?: "page" | "sidebar";
  renderMode?: TreeRenderMode;
  workspaceId: string;
  workspaceType: "professional" | "academic" | "general";
  tree: TreeNode[];
  permissions: TreeContentPermissions;
  activeDocumentId?: string | null;
  onServerTreeChange?: () => void;
  onNavigate?: () => void;
  autoOpen?: "doc" | "folder" | null;
  onAutoOpenHandled?: () => void;
}

/** @deprecated Use WorkspaceDocumentTree with `tree` + `permissions`. */
interface DocumentTreeProps {
  workspaceId: string;
  workspaceType: "professional" | "academic" | "general";
  initialTree: TreeNode[];
  canCreate: boolean;
  onServerTreeChange?: () => void;
  autoOpen?: "doc" | "folder" | null;
  onAutoOpenHandled?: () => void;
}

const isRecentlyEdited = (updatedAt: string) =>
  Date.now() - new Date(updatedAt).getTime() < 60 * 60 * 1000;

const collectFolderIds = (nodes: TreeNode[], target: Set<string>) => {
  for (const node of nodes) {
    if (node.type === "folder") {
      target.add(node.id);
      collectFolderIds(node.children, target);
    }
  }
};

const countDocs = (nodes: TreeNode[]): number => {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "document") count++;
    else count += countDocs(node.children);
  }
  return count;
};

export const WorkspaceDocumentTree = ({
  variant = "page",
  renderMode = "legacy",
  workspaceId,
  workspaceType,
  tree,
  permissions,
  activeDocumentId = null,
  onServerTreeChange,
  onNavigate,
  autoOpen,
  onAutoOpenHandled,
}: WorkspaceDocumentTreeProps) => {
  const navigate = useNavigate();
  const isSidebar = variant === "sidebar";
  const useShadcnTree = isSidebar && renderMode === "shadcn";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DocStatus>("all");

  useEffect(() => {
    const all = new Set<string>();
    collectFolderIds(tree, all);
    if (activeDocumentId) {
      const expandParents = (nodes: TreeNode[], ancestors: string[]): boolean => {
        for (const n of nodes) {
          if (n.type === "document" && n.id === activeDocumentId) {
            for (const id of ancestors) all.add(id);
            return true;
          }
          if (n.type === "folder") {
            if (expandParents(n.children, [...ancestors, n.id])) return true;
          }
        }
        return false;
      };
      expandParents(tree, []);
    }
    setExpanded(all);
  }, [tree, activeDocumentId]);

  const totalDocs = useMemo(() => countDocs(tree), [tree]);
  const visibleTree = useMemo(
    () => filterTree(tree, searchQuery, statusFilter),
    [tree, searchQuery, statusFilter],
  );
  const visibleDocs = useMemo(() => countDocs(visibleTree), [visibleTree]);
  const hasFilters = searchQuery.trim().length > 0 || statusFilter !== "all";

  const [createDocTarget, setCreateDocTarget] = useState<{
    parentId: string | null;
    parentName: string | null;
  } | null>(null);
  const [createFolderTarget, setCreateFolderTarget] = useState<{
    parentId: string | null;
    parentName: string | null;
  } | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<TreeFolderNode | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<TreeFolderNode | null>(null);
  const [renameDocumentTarget, setRenameDocumentTarget] = useState<TreeDocumentNode | null>(null);
  const [moveDocumentTarget, setMoveDocumentTarget] = useState<TreeDocumentNode | null>(null);

  // Allow parent (page header buttons) to imperatively open a root-level dialog.
  useEffect(() => {
    if (!autoOpen) return;
    if (autoOpen === "doc") setCreateDocTarget({ parentId: null, parentName: null });
    if (autoOpen === "folder") setCreateFolderTarget({ parentId: null, parentName: null });
    onAutoOpenHandled?.();
  }, [autoOpen, onAutoOpenHandled]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () => {
    const all = new Set<string>();
    collectFolderIds(tree, all);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

  const handleCreateDoc = async (title: string, mockTemplateId: string) => {
    if (mockTemplateId && mockTemplateId !== "doc-blank") {
      const params = new URLSearchParams({ title, template: mockTemplateId });
      const parentId = createDocTarget?.parentId;
      if (parentId) params.set("folder", parentId);
      setCreateDocTarget(null);
      navigate(`/w/${workspaceId}/documents/new?${params.toString()}`);
      return;
    }

    try {
      const created = await createDocument(workspaceId, {
        title: title.trim(),
        folderId: createDocTarget?.parentId ?? null,
        templateId: null,
      });
      setCreateDocTarget(null);
      onServerTreeChange?.();
      toast.success(`Created "${title}"`);
      navigate(`/w/${workspaceId}/documents/${created.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not create document.";
      toast.error(msg);
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createWorkspaceFolder(workspaceId, {
        name: name.trim(),
        parentId: createFolderTarget?.parentId ?? null,
      });
      setCreateFolderTarget(null);
      onServerTreeChange?.();
      toast.success(`Created folder "${name.trim()}"`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not create folder.";
      toast.error(msg);
    }
  };

  const handleRenameFolder = async (name: string) => {
    if (!renameFolderTarget) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === renameFolderTarget.name) {
      setRenameFolderTarget(null);
      return;
    }
    try {
      await updateWorkspaceFolder(workspaceId, renameFolderTarget.id, { name: trimmed });
      setRenameFolderTarget(null);
      onServerTreeChange?.();
      toast.success("Folder renamed");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not rename folder.";
      toast.error(msg);
    }
  };

  const handleMoveFolder = async (parentId: string | null) => {
    if (!moveFolderTarget) return;
    try {
      await updateWorkspaceFolder(workspaceId, moveFolderTarget.id, { parentId });
      setMoveFolderTarget(null);
      onServerTreeChange?.();
      toast.success("Folder moved");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not move folder.";
      toast.error(msg);
    }
  };

  const handleDeleteFolder = async (folder: TreeFolderNode) => {
    if (!confirm(`Delete "${folder.name}"? The folder must be empty.`)) return;
    try {
      await deleteWorkspaceFolder(workspaceId, folder.id);
      onServerTreeChange?.();
      toast.success("Folder deleted");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Folder is not empty or could not be deleted.";
      toast.error(msg);
    }
  };

  const handleDeleteDocument = async (doc: TreeDocumentNode) => {
    if (doc.status !== "draft") {
      toast.error("Only draft documents can be deleted.");
      return;
    }
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await deleteDocument(workspaceId, doc.id);
      onServerTreeChange?.();
      toast.success("Document deleted");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not delete document.";
      toast.error(msg);
    }
  };

  const handleRenameDocument = async (title: string) => {
    if (!renameDocumentTarget) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === renameDocumentTarget.title) {
      setRenameDocumentTarget(null);
      return;
    }
    try {
      await updateDocumentMetadata(workspaceId, renameDocumentTarget.id, { title: trimmed });
      setRenameDocumentTarget(null);
      onServerTreeChange?.();
      toast.success("Document renamed");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not rename document.";
      toast.error(msg);
    }
  };

  const handleMoveDocument = async (parentId: string | null) => {
    if (!moveDocumentTarget) return;
    try {
      await updateDocumentMetadata(workspaceId, moveDocumentTarget.id, { folderId: parentId });
      setMoveDocumentTarget(null);
      onServerTreeChange?.();
      toast.success("Document moved");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not move document.";
      toast.error(msg);
    }
  };

  const flattenFoldersForMove = (
    nodes: TreeNode[],
    excludeFolderId?: string,
  ): Array<{ id: string; label: string }> => {
    const out: Array<{ id: string; label: string }> = [{ id: "__root__", label: "Workspace root" }];
    const walk = (list: TreeNode[], prefix: string) => {
      for (const n of list) {
        if (n.type !== "folder" || n.id === excludeFolderId) continue;
        const label = prefix ? `${prefix} / ${n.name}` : n.name;
        out.push({ id: n.id, label });
        walk(n.children, label);
      }
    };
    walk(nodes, "");
    return out;
  };

  const displayTree = isSidebar ? tree : visibleTree;
  const showEmpty = displayTree.length === 0;
  const canCreate = permissions.canCreateContent;
  const rowIndent = isSidebar ? 14 : 20;

  return (
    <>
      <div
        className={cn(
          isSidebar
            ? "min-w-0"
            : "rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 shadow-sm overflow-hidden",
        )}
      >
        {!isSidebar && (
        <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-2.5">
          <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500 tracking-[0.1em] uppercase">
            Workspace files · {visibleDocs}
            {hasFilters ? ` of ${totalDocs}` : ""}{" "}
            {visibleDocs === 1 ? "doc" : "docs"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              aria-label="Expand all folders"
            >
              Expand all
            </button>
            <span className="text-stone-300" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              aria-label="Collapse all folders"
            >
              Collapse all
            </button>
          </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files and folders"
                className="h-8 w-full rounded-md border border-stone-200 bg-white pl-8 pr-8 text-[12px] text-stone-700 placeholder:text-stone-400 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                aria-label="Search document tree"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | DocStatus)}
              className="h-8 sm:w-40 rounded-md border border-stone-200 bg-white px-2 text-[12px] text-stone-700 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
              aria-label="Filter documents by status"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="changes_requested">Changes requested</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        )}

        {/* Tree */}
        <div
          role="tree"
          aria-label="Document tree"
          className={cn("py-1", (isSidebar || useShadcnTree) && "py-0")}
        >
          {useShadcnTree ? (
            <DocumentShadcnFileTree
              tree={displayTree}
              workspaceId={workspaceId}
              permissions={permissions}
              activeDocumentId={activeDocumentId}
              expanded={expanded}
              onToggleFolder={toggle}
              onNavigate={onNavigate}
              onCreateDoc={(parentId, parentName) =>
                setCreateDocTarget({ parentId, parentName })
              }
              onCreateFolder={(parentId, parentName) =>
                setCreateFolderTarget({ parentId, parentName })
              }
              onRenameFolder={(f) => setRenameFolderTarget(f)}
              onMoveFolder={(f) => setMoveFolderTarget(f)}
              onDeleteFolder={handleDeleteFolder}
              onRenameDocument={(d) => setRenameDocumentTarget(d)}
              onMoveDocument={(d) => setMoveDocumentTarget(d)}
              onDeleteDocument={handleDeleteDocument}
              canCreate={canCreate}
            />
          ) : showEmpty ? (
            <div className="py-12 text-center">
              <div className="h-10 w-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto">
                <FileText className="h-5 w-5 text-stone-400" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900 mt-4">
                {hasFilters
                  ? "No matching results"
                  : canCreate
                    ? "No documents yet"
                    : "No documents"}
              </h3>
              <p className="text-sm text-stone-500 mt-1.5 max-w-sm mx-auto">
                {hasFilters
                  ? "Try a different search or status filter."
                  : canCreate
                    ? "Create your first document to start collaborating with your team."
                    : "No documents have been created in this workspace yet."}
              </p>
              {canCreate && !hasFilters && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setCreateFolderTarget({ parentId: null, parentName: null })}
                    className="h-9 px-4 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <FolderPlus className="h-3.5 w-3.5 text-stone-500" />
                    New folder
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateDocTarget({ parentId: null, parentName: null })}
                    className="h-9 px-5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    New document
                  </button>
                </div>
              )}
            </div>
          ) : (
            displayTree.map((node) =>
              node.type === "folder" ? (
                <TreeFolderRow
                  key={node.id}
                  folder={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  workspaceId={workspaceId}
                  permissions={permissions}
                  isSidebar={isSidebar}
                  rowIndent={rowIndent}
                  activeDocumentId={activeDocumentId}
                  onNavigate={onNavigate}
                  onCreateDoc={(parentId, parentName) =>
                    setCreateDocTarget({ parentId, parentName })
                  }
                  onCreateFolder={(parentId, parentName) =>
                    setCreateFolderTarget({ parentId, parentName })
                  }
                  onRenameFolder={(f) => setRenameFolderTarget(f)}
                  onMoveFolder={(f) => setMoveFolderTarget(f)}
                  onDeleteFolder={handleDeleteFolder}
                  onRenameDocument={(d) => setRenameDocumentTarget(d)}
                  onMoveDocument={(d) => setMoveDocumentTarget(d)}
                  onDeleteDocument={handleDeleteDocument}
                />
              ) : (
                <TreeDocumentRow
                  key={node.id}
                  document={node}
                  depth={0}
                  workspaceId={workspaceId}
                  permissions={permissions}
                  isSidebar={isSidebar}
                  rowIndent={rowIndent}
                  activeDocumentId={activeDocumentId}
                  onNavigate={onNavigate}
                  onRename={(d) => setRenameDocumentTarget(d)}
                  onMove={(d) => setMoveDocumentTarget(d)}
                  onDelete={handleDeleteDocument}
                />
              ),
            )
          )}
        </div>
      </div>

      {createDocTarget && (
        <TreeCreateDialog
          open
          kind="document"
          workspaceType={workspaceType}
          folderName={createDocTarget.parentName}
          onClose={() => setCreateDocTarget(null)}
          onCreated={handleCreateDoc}
        />
      )}
      {createFolderTarget && (
        <TreeCreateDialog
          open
          kind="folder"
          parentName={createFolderTarget.parentName}
          onClose={() => setCreateFolderTarget(null)}
          onCreated={handleCreateFolder}
        />
      )}
      {renameFolderTarget && (
        <TreeCreateDialog
          open
          kind="folder"
          parentName={null}
          defaultName={renameFolderTarget.name}
          onClose={() => setRenameFolderTarget(null)}
          onCreated={handleRenameFolder}
        />
      )}
      {moveFolderTarget && (
        <TreeMoveDialog
          itemLabel="folder"
          itemName={moveFolderTarget.name}
          options={flattenFoldersForMove(tree, moveFolderTarget.id)}
          onCancel={() => setMoveFolderTarget(null)}
          onSelect={(id) => void handleMoveFolder(id === "__root__" ? null : id)}
        />
      )}
      {renameDocumentTarget && (
        <TreeCreateDialog
          open
          kind="document"
          workspaceType={workspaceType}
          folderName={null}
          defaultName={renameDocumentTarget.title}
          onClose={() => setRenameDocumentTarget(null)}
          onCreated={handleRenameDocument}
        />
      )}
      {moveDocumentTarget && (
        <TreeMoveDialog
          itemLabel="document"
          itemName={moveDocumentTarget.title}
          options={flattenFoldersForMove(tree)}
          onCancel={() => setMoveDocumentTarget(null)}
          onSelect={(id) => void handleMoveDocument(id === "__root__" ? null : id)}
        />
      )}
    </>
  );
};

export function DocumentTree({
  initialTree,
  canCreate,
  onServerTreeChange,
  ...rest
}: DocumentTreeProps) {
  return (
    <WorkspaceDocumentTree
      variant="page"
      tree={initialTree}
      permissions={{
        canCreateContent: canCreate,
        canOrganizeContent: canCreate,
        canDeleteContent: false,
      }}
      onServerTreeChange={onServerTreeChange}
      {...rest}
    />
  );
}
