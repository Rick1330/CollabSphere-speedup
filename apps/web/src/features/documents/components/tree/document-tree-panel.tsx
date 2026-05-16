import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
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
}

export const DocumentTreePanel = ({
  workspaceId,
  workspaceName,
  workspaceType,
  tree,
  activeDocumentId,
  permissions,
  onServerTreeChange,
  onNavigate,
  className,
}: DocumentTreePanelProps) => {
  return (
    <aside
      aria-label="Workspace documents"
      className={cn(
        "flex flex-col h-full bg-stone-50/60 border-r border-stone-200 min-w-0",
        className,
      )}
    >
      
        <div className="h-12 flex items-center justify-between gap-2 px-3 border-b border-stone-200 bg-stone-50/80 shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            <Link
              to={`/w/${workspaceId}/documents`}
              className="h-6 w-6 -ml-1 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Back to all documents"
              title="All documents"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-stone-900 tracking-tight leading-none truncate">
                Documents
              </h2>
              <p className="font-mono text-[9px] text-stone-400 tracking-[0.12em] uppercase mt-1 truncate">
                {workspaceName}
              </p>
            </div>
          </div>
        </div>

      <nav aria-label="Document tree" className="flex-1 overflow-y-auto py-1.5 min-h-0">
        <WorkspaceDocumentTree
          variant="sidebar"
          workspaceId={workspaceId}
          workspaceType={workspaceType}
          tree={tree}
          permissions={permissions}
          activeDocumentId={activeDocumentId}
          onServerTreeChange={onServerTreeChange}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="border-t border-stone-200 px-3 py-2 flex items-center justify-between bg-stone-50/80 shrink-0">
        <Link
          to={`/w/${workspaceId}/documents`}
          className="font-mono text-[10px] tracking-wider uppercase text-stone-400 hover:text-stone-700 transition-colors"
        >
          All documents →
        </Link>
      </div>
    </aside>
  );
};
