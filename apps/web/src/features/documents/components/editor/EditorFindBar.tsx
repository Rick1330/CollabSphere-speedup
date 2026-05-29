import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDocumentFindState,
  type DocumentFindState,
} from "@/features/documents/editor-extensions/document-find.extension";

type EditorFindBarProps = {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  initialQuery?: string;
};

function scrollToMatch(
  editor: Editor,
  from: number,
  queryLength: number,
  scrollContainer?: HTMLElement | null,
): void {
  editor.chain().focus().setTextSelection({ from, to: from + queryLength }).run();
  const domAtPos = editor.view.domAtPos(from);
  const node = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
  if (!node) return;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  if (!el) return;
  const scroller =
    scrollContainer ?? (el.closest(".cs-paginated-canvas-outer") as HTMLElement | null);
  if (scroller) {
    const elRect = el.getBoundingClientRect();
    const scRect = scroller.getBoundingClientRect();
    scroller.scrollTo({
      top: scroller.scrollTop + elRect.top - scRect.top - scroller.clientHeight * 0.25,
      behavior: "smooth",
    });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function EditorFindBar({
  editor,
  open,
  onOpenChange,
  scrollContainerRef,
  initialQuery = "",
}: EditorFindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [findState, setFindState] = useState<DocumentFindState | null>(null);

  useEffect(() => {
    if (!open || !editor || editor.isDestroyed) return;
    if (initialQuery) {
      setQuery(initialQuery);
      editor.commands.setDocumentFindQuery(initialQuery);
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [open, editor, initialQuery]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const sync = () => setFindState(getDocumentFindState(editor));
    sync();
    editor.on("transaction", sync);
    return () => {
      editor.off("transaction", sync);
    };
  }, [editor, query, open]);

  const applyQuery = useCallback(
    (value: string) => {
      setQuery(value);
      editor?.commands.setDocumentFindQuery(value);
    },
    [editor],
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (!editor || editor.isDestroyed) return;
      const state = getDocumentFindState(editor);
      if (!state || state.matchPositions.length === 0) return;
      const wrapped =
        ((index % state.matchPositions.length) + state.matchPositions.length) %
        state.matchPositions.length;
      editor.commands.setDocumentFindActiveIndex(wrapped);
      const from = state.matchPositions[wrapped]!;
      scrollToMatch(editor, from, state.query.trim().length, scrollContainerRef?.current ?? null);
    },
    [editor, scrollContainerRef],
  );

  const close = useCallback(() => {
    editor?.commands.clearDocumentFind();
    setQuery("");
    onOpenChange(false);
  }, [editor, onOpenChange]);

  if (!open) return null;

  const matchCount = findState?.matchPositions.length ?? 0;
  const activeIndex = findState?.activeIndex ?? 0;
  const label =
    matchCount === 0
      ? query.trim()
        ? "No matches"
        : ""
      : `${activeIndex + 1} of ${matchCount}`;

  return (
    <div
      className={cn(
        "editor-print-hide absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-0)] px-3 py-2 shadow-lg",
      )}
      role="search"
    >
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => applyQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            goToIndex(e.shiftKey ? activeIndex - 1 : activeIndex + 1);
          }
        }}
        placeholder="Find in document…"
        className="h-8 w-52 border-0 bg-transparent text-sm outline-none"
        aria-label="Find in document"
      />
      <span className="min-w-[4.5rem] text-xs text-[var(--text-tertiary)]">{label}</span>
      <button
        type="button"
        className="rounded p-1 hover:bg-[var(--surface-2)]"
        aria-label="Previous match"
        disabled={matchCount === 0}
        onClick={() => goToIndex(activeIndex - 1)}
      >
        <ChevronUp size={16} />
      </button>
      <button
        type="button"
        className="rounded p-1 hover:bg-[var(--surface-2)]"
        aria-label="Next match"
        disabled={matchCount === 0}
        onClick={() => goToIndex(activeIndex + 1)}
      >
        <ChevronDown size={16} />
      </button>
      <button
        type="button"
        className="rounded p-1 hover:bg-[var(--surface-2)]"
        aria-label="Close find"
        onClick={close}
      >
        <X size={16} />
      </button>
    </div>
  );
}
