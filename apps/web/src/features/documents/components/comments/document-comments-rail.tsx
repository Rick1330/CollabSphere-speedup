import { useEffect, useRef } from "react";
import { Info, MessageSquare, MessageSquarePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskAssignee } from "@/api/adapters/tasks";
import type { CommentNode, CommentThread } from "@/lib/mock-comments";
import type { CommentFilter } from "@/features/documents/hooks/use-document-comments";
import type { PendingCommentState } from "@/features/documents/lib/editor-comment-events";
import {
  EditorRailEmptyState,
  EditorRailHeader,
} from "@/features/documents/components/editor/editor-rail-chrome";
import { DocumentCommentComposer } from "./document-comment-composer";
import { DocumentCommentThreadCard } from "./document-comment-thread";
import { DocumentThreadFilters } from "./document-thread-filters";

interface DocumentCommentsRailProps {
  threads: CommentThread[];
  filter: CommentFilter;
  openCount: number;
  resolvedCount: number;
  activeThreadId: string | null;
  canComment: boolean;
  canResolve: boolean;
  onFilterChange: (f: CommentFilter) => void;
  onCreate: (body: CommentNode[]) => void;
  onReply: (threadId: string, body: CommentNode[]) => void;
  onToggleResolve: (threadId: string) => void;
  onSelectThread: (threadId: string | null) => void;
  onJumpToAnchor: (threadId: string) => void;
  onClose?: () => void;
  members: TaskAssignee[];
  membersById: Map<string, TaskAssignee>;
  pendingComment?: PendingCommentState | null;
  onSubmitAnchored?: (body: CommentNode[]) => void;
  onCancelPending?: () => void;
  selectionFilterActive?: boolean;
  onClearSelectionFilter?: () => void;
  embedded?: boolean;
}

function commentsSubtitle(
  selectionFilterActive: boolean,
  threadsLength: number,
  openCount: number,
): string {
  if (selectionFilterActive) {
    if (threadsLength === 0) return "No comments on selection";
    return `${threadsLength} on selection`;
  }
  if (openCount === 0) return "No open threads";
  return `${openCount} open ${openCount === 1 ? "thread" : "threads"}`;
}

export const DocumentCommentsRail = ({
  threads,
  filter,
  openCount,
  resolvedCount,
  activeThreadId,
  canComment,
  canResolve,
  onFilterChange,
  onCreate,
  onReply,
  onToggleResolve,
  onSelectThread,
  onJumpToAnchor,
  onClose,
  members,
  membersById,
  pendingComment,
  onSubmitAnchored,
  onCancelPending,
  selectionFilterActive = false,
  onClearSelectionFilter,
  embedded = false,
}: DocumentCommentsRailProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeThreadId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-thread-id="${activeThreadId}"]`);
    if (el && "scrollIntoView" in el) {
      (el as HTMLElement).scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeThreadId]);

  const Root = embedded ? "div" : "aside";

  return (
    <Root
      aria-label="Document comments"
      className={cn(
        "flex h-full min-w-0 flex-col",
        !embedded && "border-l border-stone-200 bg-white editor-rail",
      )}
    >
      <EditorRailHeader
        title="Comments"
        subtitle={commentsSubtitle(selectionFilterActive, threads.length, openCount)}
        icon={MessageSquare}
        trailing={
          onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--editor-text-muted)] transition-colors hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text-primary)]"
              aria-label="Close comments"
            >
              <X className="h-4 w-4" />
            </button>
          ) : undefined
        }
      />

      <div className="shrink-0 border-b border-[var(--editor-border)] px-4 py-2.5">
        <DocumentThreadFilters
          filter={filter}
          openCount={openCount}
          resolvedCount={resolvedCount}
          onChange={onFilterChange}
        />
      </div>

      {pendingComment && onSubmitAnchored && onCancelPending && (
        <div className="shrink-0 space-y-3 border-b border-teal-100 bg-[var(--editor-accent-lighter)]/40 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--editor-text-primary)]">
              <MessageSquarePlus className="h-4 w-4 text-[var(--editor-accent)]" aria-hidden="true" />
              New comment
            </h3>
            <button
              type="button"
              onClick={onCancelPending}
              className="text-xs font-medium text-[var(--editor-text-muted)] hover:text-[var(--editor-text-primary)]"
            >
              Cancel
            </button>
          </div>
          <blockquote className="rounded-lg border border-[var(--editor-border)] border-l-[3px] border-l-[var(--editor-accent)] bg-[var(--editor-surface)] px-3 py-2 text-[13px] italic leading-snug text-[var(--editor-text-secondary)] max-h-28 overflow-y-auto">
            &ldquo;{pendingComment.quote}&rdquo;
          </blockquote>
          <DocumentCommentComposer
            placeholder="Type your comment… use @ to mention"
            submitLabel="Comment"
            autoFocus
            members={members}
            onSubmit={onSubmitAnchored}
            onCancel={onCancelPending}
          />
        </div>
      )}

      {filter === "open" && canComment && !pendingComment && (
        <div className="shrink-0 border-b border-[var(--editor-border)] px-4 py-3">
          <DocumentCommentComposer
            placeholder="Start a general document discussion…"
            submitLabel="Post"
            members={members}
            onSubmit={onCreate}
          />
        </div>
      )}

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-py-2 px-3 py-3">
        {threads.length === 0 ? (
          <RailEmptyState
            filter={filter}
            canComment={canComment}
            hasPending={!!pendingComment}
            selectionFilterActive={selectionFilterActive}
            onClearSelectionFilter={onClearSelectionFilter}
          />
        ) : (
          threads.map((t) => (
            <div key={t.id} data-thread-id={t.id}>
              <DocumentCommentThreadCard
                thread={t}
                isActive={t.id === activeThreadId}
                canResolve={canResolve}
                canReply={canComment}
                members={members}
                membersById={membersById}
                onSelect={() => onSelectThread(t.id === activeThreadId ? null : t.id)}
                onJumpToAnchor={t.anchor ? () => onJumpToAnchor(t.id) : undefined}
                onReply={(body) => onReply(t.id, body)}
                onToggleResolve={() => onToggleResolve(t.id)}
              />
            </div>
          ))
        )}
      </div>

      {!canComment && filter === "open" && (
        <div className="flex shrink-0 items-start gap-2 border-t border-[var(--editor-border)] bg-[var(--editor-surface-hover)] px-4 py-2.5 text-[11px] text-[var(--editor-text-muted)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--editor-info)]" aria-hidden="true" />
          <span>You have view-only access. You can read threads but not post replies.</span>
        </div>
      )}
    </Root>
  );
};

const RailEmptyState = ({
  filter,
  canComment,
  hasPending,
  selectionFilterActive,
  onClearSelectionFilter,
}: {
  filter: CommentFilter;
  canComment: boolean;
  hasPending: boolean;
  selectionFilterActive?: boolean;
  onClearSelectionFilter?: () => void;
}) => {
  if (hasPending) {
    return null;
  }
  if (selectionFilterActive) {
    return (
      <EditorRailEmptyState
        icon={MessageSquare}
        title="No comments on selection"
        action={
          onClearSelectionFilter ? (
            <button
              type="button"
              onClick={onClearSelectionFilter}
              className="rounded-lg bg-[var(--editor-accent-lighter)] px-3 py-1.5 text-xs font-semibold text-[var(--editor-accent-text)] transition-colors hover:bg-teal-100"
            >
              Show all comments
            </button>
          ) : undefined
        }
      />
    );
  }
  if (filter === "resolved") {
    return (
      <EditorRailEmptyState
        icon={MessageSquare}
        title="No resolved threads"
        description="Resolved discussions will appear here for reference."
      />
    );
  }
  return (
    <EditorRailEmptyState
      icon={MessageSquarePlus}
      title="No comments yet"
      description={
        canComment ? (
          <>
            Select text in the document for an inline comment, or start a general thread above.
          </>
        ) : (
          "No discussion has started on this document yet."
        )
      }
    />
  );
};
