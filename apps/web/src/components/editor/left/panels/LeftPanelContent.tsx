import { useEffect, type ReactNode, type RefObject } from "react";
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
} from "@/features/documents/stores/use-editor-store";
import type { WorkspaceRole } from "@/api/adapters/members";

export type LeftPanelContentProps = {
  workspaceId: string;
  workspaceName: string;
  workspaceType: "professional" | "academic" | "general";
  myRole: WorkspaceRole;
  reviewTabContent?: ReactNode;
  submissionsTabContent?: ReactNode;
  showReviewTab?: boolean;
  showSubmissionsTab?: boolean;
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
  myRole,
  reviewTabContent,
  submissionsTabContent,
  showReviewTab = false,
  showSubmissionsTab = false,
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
  const setLeftSidebarTab = useEditorStore((s) => s.setLeftSidebarTab);
  const activeTab = activeTabProp ?? storeTab;
  void workspaceType;
  void myRole;

  useEffect(() => {
    hydrateLeftSidebarTab();
  }, [hydrateLeftSidebarTab]);

  useEffect(() => {
    const tabHidden =
      (activeTab === "review" && !showReviewTab) ||
      (activeTab === "submissions" && !showSubmissionsTab);
    if (!tabHidden) return;
    setLeftSidebarTab("files");
  }, [activeTab, setLeftSidebarTab, showReviewTab, showSubmissionsTab]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
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
      {activeTab === "review" && showReviewTab && (
        <div key="review" className="editor-rail-tab-body flex min-h-0 flex-1 flex-col overflow-y-auto">
          {reviewTabContent ?? (
            <div className="p-3 text-sm text-stone-500">No pending reviews in this document context.</div>
          )}
        </div>
      )}
      {activeTab === "submissions" && showSubmissionsTab && (
        <div key="submissions" className="editor-rail-tab-body flex min-h-0 flex-1 flex-col overflow-y-auto">
          {submissionsTabContent ?? (
            <div className="p-3 text-sm text-stone-500">No submission activity yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
