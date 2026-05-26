import { useState } from "react";
import {
  Check,
  CheckCircle2,
  CornerDownRight,
  LocateFixed,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import type { TaskAssignee } from "@/api/adapters/tasks";
import { getInitials, relativeTime } from "@/lib/format";
import type { CommentThread } from "@/lib/mock-comments";
import { cn } from "@/lib/utils";
import { resolveCommentAuthor, resolveMemberDisplay } from "@/features/documents/lib/comment-author";
import { DocumentCommentBody } from "./document-comment-body";
import { DocumentCommentComposer } from "./document-comment-composer";
import type { CommentNode } from "@/lib/mock-comments";

interface DocumentCommentThreadProps {
  thread: CommentThread;
  isActive: boolean;
  canResolve: boolean;
  canReply: boolean;
  members: TaskAssignee[];
  membersById: Map<string, TaskAssignee>;
  onSelect: () => void;
  onJumpToAnchor?: () => void;
  onReply: (body: CommentNode[]) => void;
  onToggleResolve: () => void;
}

export const DocumentCommentThreadCard = ({
  thread,
  isActive,
  canResolve,
  canReply,
  members,
  membersById,
  onSelect,
  onJumpToAnchor,
  onReply,
  onToggleResolve,
}: DocumentCommentThreadProps) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const author = resolveCommentAuthor(thread.author, membersById);
  const resolver = thread.resolvedBy ? resolveMemberDisplay(thread.resolvedBy, membersById) : null;
  const replyCount = thread.replies.length;

  return (
    <article
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-[var(--editor-surface)] transition-all duration-150",
        thread.resolved && !isActive && "opacity-90",
        isActive
          ? "border-teal-300 shadow-md ring-1 ring-teal-200/60"
          : "border-[var(--editor-border)] shadow-sm hover:border-stone-300 hover:shadow",
      )}
      aria-current={isActive ? "true" : undefined}
    >
      {isActive && (
        <span
          className="absolute bottom-0 left-0 top-0 w-[3px] bg-[var(--editor-accent)]"
          aria-hidden="true"
        />
      )}

      {thread.resolved && (
        <div className="flex items-center gap-1 border-b border-emerald-100 bg-emerald-50/80 px-3 py-1 text-[10px] font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Resolved
          {resolver && <span className="text-emerald-600/80">· {resolver.fullName.split(" ")[0]}</span>}
        </div>
      )}

      {thread.anchor && (
        <div className="px-3 pt-2.5">
          <blockquote
            className={cn(
              "rounded-lg border-l-[3px] bg-[var(--editor-surface-hover)] px-2.5 py-2 text-[12px] italic leading-snug text-[var(--editor-text-secondary)]",
              thread.anchor.status === "changed"
                ? "border-l-amber-400 bg-amber-50/50 text-amber-900"
                : "border-l-[var(--editor-accent)]",
            )}
          >
            &ldquo;{thread.anchor.snippet}&rdquo;
          </blockquote>
        </div>
      )}
      {thread.anchor?.status === "changed" && (
        <p className="px-3 pb-1 text-[10px] font-medium text-amber-600">Text changed since comment</p>
      )}

      <div className="flex items-start gap-2.5 px-3 pt-2.5 pb-1">
        <div
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white",
            isActive && "ring-teal-100",
          )}
          style={{ backgroundColor: author.avatarColor }}
        >
          {getInitials(author.fullName, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-[var(--editor-text-primary)]">
              {author.fullName}
            </span>
            <span className="flex-shrink-0 text-[10px] text-[var(--editor-text-muted)]">
              {relativeTime(thread.createdAt)}
            </span>
          </div>
          <div className="mt-1">
            <DocumentCommentBody body={thread.body} />
          </div>
        </div>
      </div>

      {replyCount > 0 && (
        <ul className="space-y-2.5 pb-1 pl-11 pr-3">
          {thread.replies.map((reply) => {
            const ra = resolveCommentAuthor(reply.author, membersById);
            return (
              <li key={reply.id} className="flex items-start gap-2">
                <div
                  className="mt-px flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ backgroundColor: ra.avatarColor }}
                >
                  {getInitials(ra.fullName, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-[var(--editor-text-secondary)]">
                      {ra.fullName}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-[var(--editor-text-muted)]">
                      {relativeTime(reply.createdAt)}
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <DocumentCommentBody body={reply.body} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-[var(--editor-border)] px-2 py-1">
        <div className="flex items-center gap-1 px-1 text-[10px] text-[var(--editor-text-muted)]">
          <MessageSquare className="h-3 w-3" aria-hidden="true" />
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </div>
        <div className="flex items-center gap-0.5">
          {onJumpToAnchor && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJumpToAnchor();
              }}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[var(--editor-text-muted)] transition-colors hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-accent-text)]"
              title="Jump to anchor in document"
              aria-label="Jump to anchor in document"
            >
              <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              Jump
            </button>
          )}
          {canReply && !thread.resolved && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReplyOpen((v) => !v);
                onSelect();
              }}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[var(--editor-text-muted)] transition-colors hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text-primary)]"
            >
              <CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" />
              Reply
            </button>
          )}
          {canResolve && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleResolve();
              }}
              className={cn(
                "flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors",
                thread.resolved
                  ? "text-amber-600 hover:bg-amber-50"
                  : "text-emerald-600 hover:bg-emerald-50",
              )}
              aria-label={thread.resolved ? "Reopen thread" : "Resolve thread"}
            >
              {thread.resolved ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reopen
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Resolve
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {replyOpen && canReply && !thread.resolved && (
        <div className="border-t border-[var(--editor-border)] px-3 pb-3 pt-2" onClick={(e) => e.stopPropagation()}>
          <DocumentCommentComposer
            placeholder="Reply…"
            submitLabel="Reply"
            size="sm"
            autoFocus
            members={members}
            onSubmit={(body) => {
              onReply(body);
              setReplyOpen(false);
            }}
            onCancel={() => setReplyOpen(false)}
          />
        </div>
      )}
    </article>
  );
};
