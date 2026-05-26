import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  WorkspaceDocumentTree,
  type TreeContentPermissions,
  type TreeNode,
} from "@/features/documents/components/document-tree";

interface DocumentTreePanelProps {
  workspaceId: string;
  workspaceName: string;
  workspaceType: "professional" | "academic" | "general";
  tree: TreeNode[];
  activeDocumentId: string | null;
  permissions: TreeContentPermissions;
  onServerTreeChange?: () => void;
  onNavigate?: () => void;
  className?: string;
  /** When nested inside EditorLeftSidebar — skip outer aside chrome. */
  embedded?: boolean;
}

export const DocumentTreePanel = ({
  workspaceId,
  workspaceType,
  tree,
  activeDocumentId,
  permissions,
  onServerTreeChange,
  onNavigate,
  className,
  embedded = false,
}: DocumentTreePanelProps) => {
  const Root = embedded ? "div" : "aside";

  return (
    <Root
      aria-label="Workspace documents"
      className={cn(
        "editor-files-sidebar flex h-full min-w-0 flex-col",
        !embedded && "editor-rail border-r border-stone-200",
        className,
      )}
    >
      <SidebarProvider
        className="flex min-h-0 w-full flex-1"
        style={{ "--sidebar-width": "100%" } as CSSProperties}
      >
        <Sidebar
          collapsible="none"
          className="h-full w-full border-0 bg-transparent"
        >
          <SidebarContent className="min-h-0 gap-0 overflow-y-auto p-0">
            <WorkspaceDocumentTree
              variant="sidebar"
              renderMode="shadcn"
              workspaceId={workspaceId}
              workspaceType={workspaceType}
              tree={tree}
              permissions={permissions}
              activeDocumentId={activeDocumentId}
              onServerTreeChange={onServerTreeChange}
              onNavigate={onNavigate}
            />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>

      <div
        className={cn(
          "flex shrink-0 items-center border-t px-3 py-2",
          embedded ? "border-[var(--editor-border)]" : "border-stone-200",
        )}
      >
        <Link
          to={`/w/${workspaceId}/documents`}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--editor-text-muted)] transition-colors hover:text-[var(--editor-accent-text)]"
        >
          All documents
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Root>
  );
};
