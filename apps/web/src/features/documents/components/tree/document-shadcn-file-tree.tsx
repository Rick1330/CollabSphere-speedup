import { Link } from "react-router-dom";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import type {
  TreeContentPermissions,
  TreeDocumentNode,
  TreeFolderNode,
  TreeNode,
} from "@/features/documents/components/document-tree";
import { TreeContextMenu } from "@/features/documents/components/tree-context-menu";

export interface DocumentShadcnFileTreeProps {
  tree: TreeNode[];
  workspaceId: string;
  permissions: TreeContentPermissions;
  activeDocumentId: string | null;
  expanded: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onNavigate?: () => void;
  onCreateDoc: (parentId: string, parentName: string) => void;
  onCreateFolder: (parentId: string, parentName: string) => void;
  onRenameFolder: (folder: TreeFolderNode) => void;
  onMoveFolder: (folder: TreeFolderNode) => void;
  onDeleteFolder: (folder: TreeFolderNode) => void;
  onRenameDocument: (doc: TreeDocumentNode) => void;
  onMoveDocument: (doc: TreeDocumentNode) => void;
  onDeleteDocument: (doc: TreeDocumentNode) => void;
  canCreate: boolean;
}

interface FolderTreeNodeProps extends Omit<DocumentShadcnFileTreeProps, "tree" | "canCreate"> {
  folder: TreeFolderNode;
}

interface DocumentTreeNodeProps {
  document: TreeDocumentNode;
  workspaceId: string;
  permissions: TreeContentPermissions;
  activeDocumentId: string | null;
  onNavigate?: () => void;
  onRenameDocument: (doc: TreeDocumentNode) => void;
  onMoveDocument: (doc: TreeDocumentNode) => void;
  onDeleteDocument: (doc: TreeDocumentNode) => void;
}

function ShadcnDocumentRow({
  document: doc,
  workspaceId,
  permissions,
  activeDocumentId,
  onNavigate,
  onRenameDocument,
  onMoveDocument,
  onDeleteDocument,
}: DocumentTreeNodeProps) {
  const isActive = activeDocumentId === doc.id;
  const canDeleteDoc = permissions.canDeleteContent && doc.status === "draft";

  return (
    <SidebarMenuItem>
      <div className="flex w-full min-w-0 items-center pr-1">
        <TreeContextMenu
          permissions={permissions}
          type="document"
          name={doc.title}
          onOpen={() => onNavigate?.()}
          onRename={() => onRenameDocument(doc)}
          onMove={() => onMoveDocument(doc)}
          onDelete={canDeleteDoc ? () => onDeleteDocument(doc) : undefined}
        >
          <SidebarMenuButton
            asChild
            isActive={isActive}
            className={cn(
              "min-h-[var(--editor-rail-row-height,2.25rem)] min-w-0 flex-1",
              isActive &&
                "bg-[var(--editor-surface-active)] text-[var(--editor-accent-text)] hover:bg-[var(--editor-surface-active)] hover:text-[var(--editor-accent-text)]",
            )}
          >
            <Link
              to={`/w/${workspaceId}/documents/${doc.id}`}
              onClick={() => onNavigate?.()}
              title={doc.title}
            >
              <FileText className="!size-4 shrink-0" />
              <span className="truncate">{doc.title}</span>
            </Link>
          </SidebarMenuButton>
        </TreeContextMenu>
      </div>
    </SidebarMenuItem>
  );
}

function ShadcnFolderRow({
  folder,
  workspaceId,
  permissions,
  activeDocumentId,
  expanded,
  onToggleFolder,
  onNavigate,
  onCreateDoc,
  onCreateFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onRenameDocument,
  onMoveDocument,
  onDeleteDocument,
}: FolderTreeNodeProps) {
  const isOpen = expanded.has(folder.id);
  const FolderIcon = isOpen ? FolderOpen : Folder;

  return (
    <SidebarMenuItem>
      <Collapsible
        open={isOpen}
        onOpenChange={() => onToggleFolder(folder.id)}
        className="group/collapsible w-full [&[data-state=open]>div>button>svg:first-child]:rotate-90"
      >
        <div className="flex w-full min-w-0 items-center pr-1">
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
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="min-h-[var(--editor-rail-row-height,2.25rem)] min-w-0 flex-1">
                <ChevronRight className="!size-4 shrink-0 transition-transform duration-150" />
                <FolderIcon className="!size-4 shrink-0 text-teal-600" />
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto min-h-5 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium tabular-nums text-stone-500">
                  {folder.children.length}
                </span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </TreeContextMenu>
        </div>
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 border-l border-stone-200/80">
            {folder.children.map((child) =>
              child.type === "folder" ? (
                <ShadcnFolderRow
                  key={child.id}
                  folder={child}
                  workspaceId={workspaceId}
                  permissions={permissions}
                  activeDocumentId={activeDocumentId}
                  expanded={expanded}
                  onToggleFolder={onToggleFolder}
                  onNavigate={onNavigate}
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
                <ShadcnDocumentRow
                  key={child.id}
                  document={child}
                  workspaceId={workspaceId}
                  permissions={permissions}
                  activeDocumentId={activeDocumentId}
                  onNavigate={onNavigate}
                  onRenameDocument={onRenameDocument}
                  onMoveDocument={onMoveDocument}
                  onDeleteDocument={onDeleteDocument}
                />
              ),
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function DocumentShadcnFileTree({
  tree,
  workspaceId,
  permissions,
  activeDocumentId,
  expanded,
  onToggleFolder,
  onNavigate,
  onCreateDoc,
  onCreateFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
  onRenameDocument,
  onMoveDocument,
  onDeleteDocument,
  canCreate,
}: DocumentShadcnFileTreeProps) {
  if (tree.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-stone-50">
          <FileText className="!size-5 text-stone-400" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-[var(--editor-text-secondary)]">
          {canCreate ? "No documents yet" : "No documents"}
        </p>
        {canCreate && (
          <p className="mt-1.5 text-xs text-[var(--editor-text-muted)]">
            Right-click a folder to add files.
          </p>
        )}
      </div>
    );
  }

  return (
    <SidebarGroup className="p-2">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {tree.map((node) =>
            node.type === "folder" ? (
              <ShadcnFolderRow
                key={node.id}
                folder={node}
                workspaceId={workspaceId}
                permissions={permissions}
                activeDocumentId={activeDocumentId}
                expanded={expanded}
                onToggleFolder={onToggleFolder}
                onNavigate={onNavigate}
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
              <ShadcnDocumentRow
                key={node.id}
                document={node}
                workspaceId={workspaceId}
                permissions={permissions}
                activeDocumentId={activeDocumentId}
                onNavigate={onNavigate}
                onRenameDocument={onRenameDocument}
                onMoveDocument={onMoveDocument}
                onDeleteDocument={onDeleteDocument}
              />
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
