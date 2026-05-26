import { Redo2, Undo2, X } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

export interface FocusModeToolbarPillProps {
  editor: Editor | null;
  onExitFocus: () => void;
  className?: string;
}

export function FocusModeToolbarPill({
  editor,
  onExitFocus,
  className,
}: FocusModeToolbarPillProps) {
  return (
    <div
      className={cn(
        "cs-focus-toolbar-pill editor-print-hide fixed left-1/2 z-50 flex h-8 -translate-x-1/2 items-center gap-0.5",
        "rounded-full border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-1 shadow-[var(--shadow-md)]",
        "top-[calc(var(--topbar-h)+var(--space-2))]",
        className,
      )}
      role="toolbar"
      aria-label="Focus mode tools"
    >
      <button
        type="button"
        className="cs-focus-pill-btn"
        aria-label="Undo"
        disabled={!editor?.can().undo()}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        className="cs-focus-pill-btn"
        aria-label="Redo"
        disabled={!editor?.can().redo()}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <Redo2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span className="mx-1 h-4 w-px bg-[var(--border-subtle)]" aria-hidden />
      <button
        type="button"
        className="cs-focus-pill-btn cs-focus-pill-btn--exit"
        aria-label="Exit focus mode"
        onClick={onExitFocus}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[11px] font-medium">Exit focus</span>
      </button>
    </div>
  );
}
