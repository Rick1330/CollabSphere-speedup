import { Paintbrush, Printer, Redo, Undo } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui-kit";
import { canRedo, canUndo, type ToolbarEditorProps } from "../toolbar-utils";

export function HistoryGroup({ editor, isReadOnly }: ToolbarEditorProps) {
  return (
    <>
      <IconButton
        aria-label="Undo (⌘Z)"
        tooltip="Undo (⌘Z)"
        disabled={isReadOnly || !canUndo(editor)}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <Undo size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Redo (⌘⇧Z)"
        tooltip="Redo (⌘⇧Z)"
        disabled={isReadOnly || !canRedo(editor)}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <Redo size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Print"
        tooltip="Print"
        onClick={() => {
          try {
            window.print();
          } catch {
            toast.info("Print blocked — use browser print (Ctrl+P)");
          }
        }}
      >
        <Printer size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Format painter"
        tooltip="Format painter"
        disabled={isReadOnly}
        onClick={() => toast.info("Format painter — coming soon")}
      >
        <Paintbrush size={16} strokeWidth={1.75} />
      </IconButton>
    </>
  );
}
