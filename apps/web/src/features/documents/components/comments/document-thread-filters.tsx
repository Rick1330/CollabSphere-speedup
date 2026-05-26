import type { CSSProperties } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommentFilter } from "@/features/documents/hooks/use-document-comments";

interface DocumentThreadFiltersProps {
  filter: CommentFilter;
  openCount: number;
  resolvedCount: number;
  onChange: (next: CommentFilter) => void;
}

export const DocumentThreadFilters = ({
  filter,
  openCount,
  resolvedCount,
  onChange,
}: DocumentThreadFiltersProps) => (
  <div
    role="tablist"
    aria-label="Filter comment threads"
    className="editor-rail-tabs w-full"
    style={
      {
        "--editor-rail-tab-count": 2,
        "--editor-rail-tab-index": filter === "open" ? 0 : 1,
      } as CSSProperties
    }
  >
    <button
      type="button"
      role="tab"
      aria-selected={filter === "open"}
      onClick={() => onChange("open")}
      className={cn(
        "editor-rail-tab flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
        filter === "open"
          ? "text-[var(--editor-accent-text)]"
          : "text-[var(--editor-text-muted)] hover:text-[var(--editor-text-secondary)]",
      )}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Open
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          filter === "open"
            ? "bg-[var(--editor-accent-lighter)] text-[var(--editor-accent-text)]"
            : "bg-stone-200/80 text-stone-500",
        )}
      >
        {openCount}
      </span>
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={filter === "resolved"}
      onClick={() => onChange("resolved")}
      className={cn(
        "editor-rail-tab flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
        filter === "resolved"
          ? "text-[var(--editor-text-secondary)]"
          : "text-[var(--editor-text-muted)] hover:text-[var(--editor-text-secondary)]",
      )}
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Resolved
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          filter === "resolved"
            ? "bg-stone-200 text-stone-700"
            : "bg-stone-200/80 text-stone-500",
        )}
      >
        {resolvedCount}
      </span>
    </button>
  </div>
);
