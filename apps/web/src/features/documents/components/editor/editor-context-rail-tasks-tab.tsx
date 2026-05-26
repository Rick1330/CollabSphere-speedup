import { Link } from "react-router-dom";
import { ArrowUpRight, CheckSquare, Circle, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EditorRailEmptyState,
  EditorRailHeader,
  EditorRailSection,
} from "@/features/documents/components/editor/editor-rail-chrome";
import type { DocumentLinkedTaskEntry } from "@/features/documents/hooks/use-document-linked-tasks";
import { STATUS_LABELS } from "@/api/adapters/tasks";
import { formatDueDate, getInitials } from "@/lib/format";
import type { TaskPriority } from "@/features/tasks/mocks/tasks";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface EditorContextRailTasksTabProps {
  workspaceId: string;
  entries: DocumentLinkedTaskEntry[];
  isLoading: boolean;
  onJumpToSnippet?: (snippet: string) => void;
}

function TaskStatusIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
        aria-hidden="true"
      >
        ✓
      </span>
    );
  }
  return (
    <Circle
      className="h-5 w-5 shrink-0 text-[var(--editor-text-placeholder)]"
      aria-hidden="true"
    />
  );
}

function LinkedTaskCard({
  entry,
  workspaceId,
  onJumpToSnippet,
}: {
  entry: DocumentLinkedTaskEntry;
  workspaceId: string;
  onJumpToSnippet?: (snippet: string) => void;
}) {
  const { task, link } = entry;
  const done = task.status === "done";
  const snippet = link.anchor?.snippet?.trim();
  const hasAnchor = Boolean(snippet);
  const assigneeName = task.assignee?.fullName;
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <article className="rounded-xl border border-[var(--editor-border)] bg-[var(--editor-surface)] p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <TaskStatusIcon done={done} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm font-semibold leading-snug text-[var(--editor-text-primary)]",
                done && "text-[var(--editor-text-muted)] line-through",
              )}
            >
              {task.title}
            </p>
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-[var(--editor-text-muted)]">
              {done ? "Done" : PRIORITY_LABELS[task.priority as TaskPriority] ?? task.priority}
            </span>
          </div>
          {snippet ? (
            <p className="mt-1.5 line-clamp-2 text-xs italic text-[var(--editor-text-secondary)]">
              &ldquo;{snippet}&rdquo;
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-[var(--editor-text-muted)]">
              Linked to document, no specific text
            </p>
          )}
          {(assigneeName || due) && (
            <p className="mt-1.5 text-xs text-[var(--editor-text-muted)]">
              {assigneeName && (
                <span className="inline-flex items-center gap-1">
                  {task.assignee && (
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[8px] font-bold text-white"
                      aria-hidden="true"
                    >
                      {getInitials(assigneeName, 1)}
                    </span>
                  )}
                  {assigneeName}
                </span>
              )}
              {assigneeName && due && <span className="mx-1">·</span>}
              {due && (
                <span className={due.isOverdue ? "text-rose-600" : undefined}>{due.text}</span>
              )}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {hasAnchor && onJumpToSnippet && (
              <button
                type="button"
                onClick={() => onJumpToSnippet(snippet!)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--editor-accent-text)] transition-colors hover:bg-[var(--editor-accent-lighter)]"
              >
                Jump to text
                <ArrowUpRight className="h-3 w-3" />
              </button>
            )}
            <Link
              to={`/w/${workspaceId}/tasks`}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--editor-text-muted)] transition-colors hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text-primary)]"
            >
              Open task
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
      {!hasAnchor && (
        <p className="mt-2 border-t border-[var(--editor-border)] pt-2 text-[10px] text-[var(--editor-text-muted)]">
          No anchor — {STATUS_LABELS[task.status] ?? task.status}
        </p>
      )}
    </article>
  );
}

export const EditorContextRailTasksTab = ({
  workspaceId,
  entries,
  isLoading,
  onJumpToSnippet,
}: EditorContextRailTasksTabProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorRailHeader
        title="Linked tasks"
        subtitle={
          isLoading
            ? "Loading…"
            : entries.length === 0
              ? "No tasks linked yet"
              : `${entries.length} linked ${entries.length === 1 ? "task" : "tasks"}`
        }
        icon={CheckSquare}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--editor-accent-text)]" />
          </div>
        ) : entries.length === 0 ? (
          <EditorRailEmptyState
            icon={CheckSquare}
            title="No linked tasks"
            description="Select text and use the task action in the selection menu to create a linked task."
          />
        ) : (
          <EditorRailSection title="Linked tasks" count={entries.length} className="pt-0">
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={`${entry.task.id}-${entry.link.id}`}>
                  <LinkedTaskCard
                    entry={entry}
                    workspaceId={workspaceId}
                    onJumpToSnippet={onJumpToSnippet}
                  />
                </li>
              ))}
            </ul>
          </EditorRailSection>
        )}
      </div>
    </div>
  );
};
