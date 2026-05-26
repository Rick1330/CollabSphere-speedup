import { useEffect, type RefObject } from "react";
import type { Editor } from "@tiptap/react";
import { DocumentTreePanel } from "@/features/documents/components/tree/document-tree-panel";
import type {
  TreeContentPermissions,
  TreeNode,
} from "@/features/documents/components/document-tree";
import { EditorLeftSidebarOutlineTab } from "@/features/documents/components/editor/editor-left-sidebar-outline-tab";
import { EditorLeftSidebarStatsTab } from "@/features/documents/components/editor/editor-left-sidebar-stats-tab";
import { PagesPanel } from "./PagesPanel";
import { BookmarksPanel } from "./BookmarksPanel";
import {
  useEditorStore,
  type LeftSidebarTab,
} from "@/components/editor/state/editorStore";

export type LeftPanelContentProps = {
  workspaceId: string;
  workspaceName: string;
  workspaceType: "professional" | "academic" | "general";
  tree: TreeNode[];
  activeDocumentId: string | null;
  permissions: TreeContentPermissions;
  onServerTreeChange?: () => void;
  onNavigate?: () => void;
  editor: Editor | null;
  isV2Template: boolean;
  scrollRootRef: RefObject<HTMLElement | null>;
  collaboratorCount: number;
  lastSavedAt: string | null;
  openCommentCount?: number;
  openTaskCount?: number;
  activeTab?: LeftSidebarTab;
};

export function LeftPanelContent({
  workspaceId,
  workspaceName,
  workspaceType,
  tree,
  activeDocumentId,
  permissions,
  onServerTreeChange,
  onNavigate,
  editor,
  isV2Template,
  scrollRootRef,
  collaboratorCount,
  lastSavedAt,
  openCommentCount,
  openTaskCount,
  activeTab: activeTabProp,
}: LeftPanelContentProps) {
  const storeTab = useEditorStore((s) => s.leftSidebarTab);
  const hydrateLeftSidebarTab = useEditorStore((s) => s.hydrateLeftSidebarTab);
  const activeTab = activeTabProp ?? storeTab;

  useEffect(() => {
    hydrateLeftSidebarTab();
  }, [hydrateLeftSidebarTab]);

  return (
    <div className="flex h-full min-h-0 w-[var(--left-panel-w)] flex-col overflow-hidden">
      {activeTab === "files" && (
        <div
          key="files"
          className="editor-rail-tab-body editor-files-sidebar flex min-h-0 flex-1 flex-col"
        >
          <DocumentTreePanel
            embedded
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            workspaceType={workspaceType}
            tree={tree}
            activeDocumentId={activeDocumentId}
            permissions={permissions}
            onServerTreeChange={onServerTreeChange}
            onNavigate={onNavigate}
            className="h-full"
          />
        </div>
      )}
      {activeTab === "pages" && (
        <div key="pages" className="editor-rail-tab-body flex min-h-0 flex-1 flex-col">
          <PagesPanel editor={editor} />
        </div>
      )}
      {activeTab === "outline" && (
        <div
          key="outline"
          className="editor-rail-tab-body editor-outline-sidebar flex min-h-0 flex-1 flex-col"
        >
          <EditorLeftSidebarOutlineTab
            editor={editor}
            isV2Template={isV2Template}
            scrollRootRef={scrollRootRef}
          />
        </div>
      )}
      {activeTab === "bookmarks" && (
        <div key="bookmarks" className="editor-rail-tab-body flex min-h-0 flex-1 flex-col">
          <BookmarksPanel />
        </div>
      )}
      {activeTab === "stats" && (
        <div key="stats" className="editor-rail-tab-body flex min-h-0 flex-1 flex-col overflow-y-auto">
          <EditorLeftSidebarStatsTab
            editor={editor}
            openCommentCount={openCommentCount}
            openTaskCount={openTaskCount}
          />
        </div>
      )}
    </div>
  );
}
