import { Link } from "react-router-dom";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { relativeTime, fullDateTime } from "@/lib/format";
import type {
  TreeContentPermissions,
  TreeDocumentNode,
  TreeFolderNode,
} from "@/features/documents/components/document-tree";
import { TreeContextMenu } from "./tree-context-menu";

const isRecentlyEdited = (updatedAt: string) =>
  Date.now() - new Date(updatedAt).getTime() < 60 * 60 * 1000;

interface FolderRowProps {
  folder: TreeFolderNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  workspaceId: string;
  permissions: TreeContentPermissions;
  isSidebar: boolean;
  rowIndent: number;
  activeDocumentId?: string | null;
  onNavigate?: () => void;
  onCreateDoc: (parentId: string, parentName: string) => void;
  onCreateFolder: (parentId: string, parentName: string) => void;
  onRenameFolder: (folder: TreeFolderNode) => void;
  onMoveFolder: (folder: TreeFolderNode) => void;
  onDeleteFolder: (folder: TreeFolderNode) => void;
  onRenameDocument: (doc: TreeDocumentNode) => void;
  onMoveDocument: (doc: TreeDocumentNode) => void;
  onDeleteDocument: (doc: TreeDocumentNode) => void;
}

export const TreeFolderRow = ({
  folder,
  depth,
  expanded,
  onToggle,
  workspaceId,
  permissions,
  isSidebar,
  rowIndent,
  activeDocumentId,
  onNavigate,
  onCreateDoc,
  onCreateFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onRenameDocument,
  onMoveDocument,
  onDeleteDocument,
}: FolderRowProps) => {
  const isExpanded = expanded.has(folder.id);
  const rowHeight = isSidebar ? "h-7" : "h-8";

  return (
    <div role="treeitem" aria-expanded={isExpanded} aria-level={depth + 1} aria-selected="false">
      <div className={cn("group flex items-center pr-1", rowHeight)}>
        <TreeContextMenu
          permissions={permissions}
          type="folder"
          name={folder.name}
          onNewDoc={() => onCreateDoc(folder.id, folder.name)}
          onNewFolder={() => onCreateFolder(folder.id, folder.name)}
          onRename={() => onRenameFolder(folder)}
          onMove={() => onMoveFolder(folder)}
          onDelete={() => onDeleteFolder(folder)}
        >
          <button
            type="button"
            className={cn(
              "flex flex-1 min-w-0 items-center cursor-pointer select-none hover:bg-stone-50 transition-colors duration-100 focus-visible:outline-none focus-visible:bg-stone-50",
              rowHeight,
            )}
            style={{ paddingLeft: `${depth * rowIndent + 8}px` }}
            onClick={() => onToggle(folder.id)}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${folder.name}`}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-stone-300 flex-shrink-0 mr-1 transition-transform duration-150",
                isExpanded && "rotate-90 text-stone-400",
              )}
              aria-hidden="true"
            />
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-teal-600 flex-shrink-0 mr-2" aria-hidden="true" />
            ) : (
              <Folder className="h-4 w-4 text-stone-400 flex-shrink-0 mr-2" aria-hidden="true" />
            )}
            <span
              className={cn(
                "truncate flex-1 text-left group-hover:text-stone-900 transition-colors duration-100",
                isSidebar ? "text-[13px] text-stone-700" : "text-sm text-stone-700",
              )}
            >
              {folder.name}
            </span>
            <span className="font-mono text-[10px] text-stone-300 mr-1 group-hover:text-stone-400 transition-colors">
              {folder.children.length}
            </span>
          </button>
        </TreeContextMenu>
      </div>

      {isExpanded && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 w-px bg-stone-200"
            style={{ left: `${depth * rowIndent + 16}px` }}
            aria-hidden="true"
          />
          {folder.children.length === 0 ? (
            <div
              className="h-7 flex items-center text-[11px] text-stone-400 italic"
              style={{ paddingLeft: `${(depth + 1) * rowIndent + 28}px` }}
            >
              Empty folder
            </div>
          ) : (
            folder.children.map((child) =>
              child.type === "folder" ? (
                <TreeFolderRow
                  key={child.id}
                  folder={child}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                  workspaceId={workspaceId}
                  permissions={permissions}
                  isSidebar={isSidebar}
                  rowIndent={rowIndent}
                  onCreateDoc={onCreateDoc}
                  onCreateFolder={onCreateFolder}
                  onRenameFolder={onRenameFolder}
                  onMoveFolder={onMoveFolder}
                  onDeleteFolder={onDeleteFolder}
                  onRenameDocument={onRenameDocument}
                  onMoveDocument={onMoveDocument}
                  onDeleteDocument={onDeleteDocument}
                />
              ) : (
                <TreeDocumentRow
                  key={child.id}
                  document={child}
                  depth={depth + 1}
                  workspaceId={workspaceId}
                  permissions={permissions}
                  isSidebar={isSidebar}
                  rowIndent={rowIndent}
                  activeDocumentId={activeDocumentId}
                  onNavigate={onNavigate}
                  onRename={onRenameDocument}
                  onMove={onMoveDocument}
                  onDelete={onDeleteDocument}
                />
              ),
            )
          )}
        </div>
      )}
    </div>
  );
};

interface DocumentRowProps {
  document: TreeDocumentNode;
  depth: number;
  workspaceId: string;
  permissions: TreeContentPermissions;
  isSidebar: boolean;
  rowIndent: number;
  activeDocumentId?: string | null;
  onNavigate?: () => void;
  onRename: (doc: TreeDocumentNode) => void;
  onMove: (doc: TreeDocumentNode) => void;
  onDelete: (doc: TreeDocumentNode) => void;
}

export const TreeDocumentRow = ({
  document: doc,
  depth,
  workspaceId,
  permissions,
  isSidebar,
  rowIndent,
  activeDocumentId,
  onNavigate,
  onRename,
  onMove,
  onDelete,
}: DocumentRowProps) => {
  const rowHeight = isSidebar ? "h-7" : "h-8";
  const isActive = activeDocumentId === doc.id;
  const canDeleteDoc = permissions.canDeleteContent && doc.status === "draft";

  return (
    <div role="treeitem" aria-level={depth + 1} aria-selected={isActive}>
      <div className={cn("group flex items-center pr-1", rowHeight)}>
        <TreeContextMenu
          permissions={permissions}
          type="document"
          name={doc.title}
          onOpen={() => onNavigate?.()}
          onRename={() => onRename(doc)}
          onMove={() => onMove(doc)}
          onDelete={canDeleteDoc ? () => onDelete(doc) : undefined}
        >
          <Link
            to={`/w/${workspaceId}/documents/${doc.id}`}
            onClick={() => onNavigate?.()}
            className={cn(
              "flex flex-1 min-w-0 items-center hover:bg-stone-50 transition-colors duration-100 focus-visible:outline-none focus-visible:bg-stone-50",
              rowHeight,
              isActive && "bg-teal-50/80 hover:bg-teal-50",
            )}
            style={{ paddingLeft: `${depth * rowIndent + (isSidebar ? 24 : 28)}px` }}
          >
            <FileText
              className={cn(
                "h-4 w-4 flex-shrink-0 mr-2 transition-colors duration-150",
                isActive ? "text-teal-600" : "text-stone-400 group-hover:text-teal-600",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "truncate flex-1 transition-colors duration-150",
                isSidebar ? "text-[13px]" : "text-sm",
                isActive ? "text-teal-800 font-medium" : "text-stone-700 group-hover:text-teal-700",
              )}
            >
              {doc.title}
            </span>
            {!isSidebar && (
              <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
                {doc.isLocked && (
                  <Lock
                    className="h-3 w-3 text-amber-500"
                    aria-label={`Locked by ${doc.lockedBy?.fullName ?? "unknown"}`}
                  />
                )}
                {doc.status !== "draft" && (
                  <span
                    className={cn(
                      "text-[9px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded border leading-none",
                      doc.status === "submitted" && "bg-amber-50 text-amber-600 border-amber-200",
                      doc.status === "changes_requested" &&
                        "bg-red-50 text-red-600 border-red-200",
                      doc.status === "approved" &&
                        "bg-emerald-50 text-emerald-600 border-emerald-200",
                      doc.status === "archived" && "bg-stone-100 text-stone-500 border-stone-200",
                    )}
                  >
                      {doc.status === "changes_requested" ? "CHANGES" : doc.status.toUpperCase()}
                  </span>
                )}
                {isRecentlyEdited(doc.updatedAt) && (
                  <div
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                    title="Recently edited"
                    aria-label="Recently edited"
                  />
                )}
                <time
                  dateTime={doc.updatedAt}
                  title={fullDateTime(doc.updatedAt)}
                  className="font-mono text-[10px] text-stone-300 tracking-wider group-hover:text-stone-400 transition-colors hidden sm:inline"
                >
                  {relativeTime(doc.updatedAt)}
                </time>
              </div>
            )}
          </Link>
        </TreeContextMenu>
      </div>
    </div>
  );
};
