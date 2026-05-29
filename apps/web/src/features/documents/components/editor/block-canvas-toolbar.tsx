import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type BlockToolbarPlacement = "above" | "below" | "overlay-top";

type BlockCanvasToolbarProps = {
  editor: Editor;
  visible: boolean;
  onDelete: () => void;
  children?: ReactNode;
  className?: string;
  placement?: BlockToolbarPlacement;
  /** When set, toolbar portals to body using this anchor's rect (avoids overflow clipping). */
  anchorRef?: React.RefObject<HTMLElement | null>;
  onToolbarMouseEnter?: () => void;
  onToolbarMouseLeave?: () => void;
};

function ToolbarChrome({
  children,
  onDelete,
  className,
  onMouseEnter,
  onMouseLeave,
}: {
  children?: ReactNode;
  onDelete: () => void;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      role="toolbar"
      className={cn(
        "flex items-center gap-1 p-1 bg-white border border-stone-200 shadow-lg rounded-lg",
        className,
      )}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
      <button
        type="button"
        aria-label="Delete block"
        title="Delete"
        onClick={onDelete}
        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function BlockCanvasToolbar({
  editor,
  visible,
  onDelete,
  children,
  className,
  placement = "overlay-top",
  anchorRef,
  onToolbarMouseEnter,
  onToolbarMouseLeave,
}: BlockCanvasToolbarProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!visible || !anchorRef?.current) {
      setRect(null);
      return;
    }
    const update = () => {
      if (anchorRef.current) {
        setRect(anchorRef.current.getBoundingClientRect());
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [visible, anchorRef]);

  if (!editor.isEditable || !visible) return null;

  const chrome = (
    <ToolbarChrome onDelete={onDelete} className={className}>
      {children}
    </ToolbarChrome>
  );

  if (anchorRef?.current && rect) {
    const top = placement === "below" ? rect.bottom + 8 : rect.top - 44;
    return createPortal(
      <div
        className="fixed z-[200] pointer-events-auto"
        style={{
          left: rect.left + rect.width / 2,
          top,
          transform: "translateX(-50%)",
        }}
        onMouseEnter={onToolbarMouseEnter}
        onMouseLeave={onToolbarMouseLeave}
      >
        {chrome}
      </div>,
      document.body,
    );
  }

  const placementClass =
    placement === "overlay-top"
      ? "absolute top-2 left-1/2 -translate-x-1/2 z-20"
      : placement === "below"
        ? "absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20"
        : "absolute -top-10 left-1/2 -translate-x-1/2 z-20";

  return <div className={placementClass}>{chrome}</div>;
}

/** Delayed hover hide so users can move pointer to portaled toolbar. */
export function useBlockHoverState(delayMs = 120) {
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onEnter = () => {
    clearTimer();
    setHovered(true);
  };

  const onLeave = () => {
    timerRef.current = setTimeout(() => setHovered(false), delayMs);
  };

  const onToolbarEnter = () => {
    clearTimer();
    setHovered(true);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { hovered, onEnter, onLeave, onToolbarEnter, onToolbarLeave: onLeave, setHovered };
}

export function deleteNodeAtPos(
  editor: Editor,
  getPos: (() => number | undefined) | boolean | undefined,
): void {
  if (typeof getPos !== "function") return;
  const pos = getPos();
  if (typeof pos !== "number") return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
}

export function selectNodeAtPos(
  editor: Editor,
  getPos: (() => number | undefined) | boolean | undefined,
): void {
  if (typeof getPos !== "function") return;
  const pos = getPos();
  if (typeof pos !== "number") return;
  const { tr } = editor.state;
  const selection = NodeSelection.create(editor.state.doc, pos);
  editor.view.dispatch(editor.state.tr.setSelection(selection));
  editor.view.focus();
}
