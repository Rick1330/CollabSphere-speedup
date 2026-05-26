import { useEffect } from "react";
import { DocumentCommentsRail } from "@/features/documents/components/comments/document-comments-rail";
import { EditorContextRailActivityTab } from "@/features/documents/components/editor/editor-context-rail-activity-tab";
import { EditorContextRailTasksTab } from "@/features/documents/components/editor/editor-context-rail-tasks-tab";
import { EditorContextRailTeamTab } from "@/features/documents/components/editor/editor-context-rail-team-tab";
import type { PresenceUser } from "@/features/documents/components/editor/editor-presence";
import type { DocumentLinkedTaskEntry } from "@/features/documents/hooks/use-document-linked-tasks";
import { useDocumentActivity } from "@/features/documents/hooks/use-document-activity";
import { useDocumentLinkedTasks } from "@/features/documents/hooks/use-document-linked-tasks";
import {
  useEditorStore,
  type RightSidebarTab,
} from "@/components/editor/state/editorStore";
import type { TaskAssignee } from "@/api/adapters/tasks";
import type { CommentFilter } from "@/features/documents/hooks/use-document-comments";
import type { CommentNode, CommentThread } from "@/lib/mock-comments";
import type { PendingCommentState } from "@/features/documents/lib/editor-comment-events";

export interface RightPanelCommentData {
  threads: CommentThread[];
  filter: CommentFilter;
  openCount: number;
  resolvedCount: number;
  activeThreadId: string | null;
  canComment: boolean;
  canResolve: boolean;
  members: TaskAssignee[];
  membersById: Map<string, TaskAssignee>;
  onFilterChange: (f: CommentFilter) => void;
  onCreate: (body: CommentNode[]) => void;
  onReply: (threadId: string, body: CommentNode[]) => void;
  onToggleResolve: (threadId: string) => void;
  onSelectThread: (threadId: string | null) => void;
  onJumpToAnchor: (threadId: string) => void;
  pendingComment?: PendingCommentState | null;
  onSubmitAnchored?: (body: CommentNode[]) => void;
  onCancelPending?: () => void;
  selectionFilterActive?: boolean;
  onClearSelectionFilter?: () => void;
}

export type RightPanelContentProps = {
  workspaceId: string;
  documentId: string;
  currentUserId: string;
  presenceUsers: PresenceUser[];
  sessionLinkedTasks: DocumentLinkedTaskEntry[];
  commentData: RightPanelCommentData;
  activeTab?: RightSidebarTab;
  onTabChange?: (tab: RightSidebarTab) => void;
  onJumpToTaskSnippet?: (snippet: string) => void;
  onClose?: () => void;
};

export function RightPanelContent({
  workspaceId,
  documentId,
  currentUserId,
  presenceUsers,
  sessionLinkedTasks,
  commentData,
  activeTab: activeTabProp,
  onJumpToTaskSnippet,
  onClose,
}: RightPanelContentProps) {
  const storeTab = useEditorStore((s) => s.rightSidebarTab);
  const hydrateRightSidebarTab = useEditorStore((s) => s.hydrateRightSidebarTab);

  useEffect(() => {
    hydrateRightSidebarTab();
  }, [hydrateRightSidebarTab]);

  const activeTab = activeTabProp ?? storeTab;

  const { entries: linkedTasks, isLoading: tasksLoading } = useDocumentLinkedTasks(
    workspaceId,
    documentId,
    sessionLinkedTasks,
  );

  const { events, isLoading: activityLoading } = useDocumentActivity(workspaceId, documentId);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {activeTab === "comments" && (
        <DocumentCommentsRail
          threads={commentData.threads}
          filter={commentData.filter}
          openCount={commentData.openCount}
          resolvedCount={commentData.resolvedCount}
          activeThreadId={commentData.activeThreadId}
          canComment={commentData.canComment}
          canResolve={commentData.canResolve}
          members={commentData.members}
          membersById={commentData.membersById}
          onFilterChange={commentData.onFilterChange}
          onCreate={commentData.onCreate}
          onReply={commentData.onReply}
          onToggleResolve={commentData.onToggleResolve}
          onSelectThread={commentData.onSelectThread}
          onJumpToAnchor={commentData.onJumpToAnchor}
          onClose={onClose}
          pendingComment={commentData.pendingComment}
          onSubmitAnchored={commentData.onSubmitAnchored}
          onCancelPending={commentData.onCancelPending}
          selectionFilterActive={commentData.selectionFilterActive}
          onClearSelectionFilter={commentData.onClearSelectionFilter}
          embedded
        />
      )}

      {activeTab === "team" && <EditorContextRailTeamTab users={presenceUsers} />}

      {activeTab === "tasks" && (
        <EditorContextRailTasksTab
          workspaceId={workspaceId}
          entries={linkedTasks}
          isLoading={tasksLoading}
          onJumpToSnippet={onJumpToTaskSnippet}
        />
      )}

      {activeTab === "activity" && (
        <EditorContextRailActivityTab
          events={events}
          isLoading={activityLoading}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

export type { DocumentLinkedTaskEntry } from "@/features/documents/hooks/use-document-linked-tasks";
