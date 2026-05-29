import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  Columns,
  Merge,
  Rows,
  Settings2,
  Split,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  runTableCommand,
  type TableCommandId,
} from "@/components/editor/shell/Toolbar/toolbar-utils";

type EditorTableBubbleMenuProps = {
  editor: Editor | null;
  enabled?: boolean;
  onOpenTableProperties?: () => void;
};

function isInTable(editor: Editor): boolean {
  return (
    editor.isActive("table") ||
    editor.isActive("tableCell") ||
    editor.isActive("tableHeader")
  );
}

function getTableClientRectFromDom(editor: Editor): DOMRect | null {
  const { from } = editor.state.selection;
  const domAt = editor.view.domAtPos(from);
  let el: HTMLElement | null =
    domAt.node instanceof HTMLElement ? domAt.node : (domAt.node.parentElement as HTMLElement | null);

  while (el && el !== editor.view.dom) {
    if (el.tagName === "TABLE" || el.classList.contains("cs-editor-table")) {
      return el.getBoundingClientRect();
    }
    if (el.classList.contains("tableWrapper")) {
      const table = el.querySelector("table");
      return (table ?? el).getBoundingClientRect();
    }
    el = el.parentElement;
  }

  const fallback = editor.view.dom.querySelector(
    "table.cs-editor-table, .tableWrapper table, table",
  );
  return fallback?.getBoundingClientRect() ?? null;
}

function getTableAnchorRect(editor: Editor): DOMRect {
  const domRect = getTableClientRectFromDom(editor);
  if (domRect && domRect.width > 0 && domRect.height > 0) {
    return domRect;
  }

  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);
  const width = 280;
  const height = 32;
  return new DOMRect(coords.left - width / 2, coords.top - height - 8, width, height);
}

function runTableAction(editor: Editor, command: TableCommandId): void {
  editor.commands.focus();
  runTableCommand(editor, command);
}

function TableBubbleBtn({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={cn(
        "h-7 w-7 rounded flex items-center justify-center text-stone-600",
        "hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-stone-200 mx-0.5 shrink-0" aria-hidden="true" />;
}

export function EditorTableBubbleMenu({
  editor,
  enabled = true,
  onOpenTableProperties,
}: EditorTableBubbleMenuProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const update = () => {
      const inTable = enabled && editor.isEditable && isInTable(editor);
      setActive(inTable);
      setRect(inTable ? getTableAnchorRect(editor) : null);
    };
    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor, enabled]);

  if (!editor || editor.isDestroyed || !active || !rect) return null;

  return createPortal(
    <div
      role="toolbar"
      aria-label="Table editing"
      className="fixed z-[200] pointer-events-auto flex items-center gap-0.5 rounded-lg border border-stone-200 bg-white p-1 shadow-lg"
      style={{
        left: rect.left + rect.width / 2,
        top: rect.top - 44,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <TableBubbleBtn label="Add row above" onPress={() => runTableAction(editor, "addRowBefore")}>
        <Rows className="h-3.5 w-3.5 rotate-180" />
      </TableBubbleBtn>
      <TableBubbleBtn label="Add row below" onPress={() => runTableAction(editor, "addRowAfter")}>
        <Rows className="h-3.5 w-3.5" />
      </TableBubbleBtn>
      <TableBubbleBtn label="Delete row" onPress={() => runTableAction(editor, "deleteRow")}>
        <Trash2 className="h-3.5 w-3.5" />
      </TableBubbleBtn>
      <Divider />
      <TableBubbleBtn label="Add column left" onPress={() => runTableAction(editor, "addColumnBefore")}>
        <Columns className="h-3.5 w-3.5 rotate-180" />
      </TableBubbleBtn>
      <TableBubbleBtn label="Add column right" onPress={() => runTableAction(editor, "addColumnAfter")}>
        <Columns className="h-3.5 w-3.5" />
      </TableBubbleBtn>
      <TableBubbleBtn label="Delete column" onPress={() => runTableAction(editor, "deleteColumn")}>
        <Trash2 className="h-3.5 w-3.5 opacity-70" />
      </TableBubbleBtn>
      <Divider />
      <TableBubbleBtn label="Merge cells" onPress={() => runTableAction(editor, "mergeCells")}>
        <Merge className="h-3.5 w-3.5" />
      </TableBubbleBtn>
      <TableBubbleBtn label="Split cell" onPress={() => runTableAction(editor, "splitCell")}>
        <Split className="h-3.5 w-3.5" />
      </TableBubbleBtn>
      <Divider />
      <TableBubbleBtn
        label="Table properties"
        onPress={() => {
          editor.commands.focus();
          onOpenTableProperties?.();
        }}
      >
        <Settings2 className="h-3.5 w-3.5" />
      </TableBubbleBtn>
      <TableBubbleBtn label="Delete table" onPress={() => runTableAction(editor, "deleteTable")}>
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </TableBubbleBtn>
    </div>,
    document.body,
  );
}
