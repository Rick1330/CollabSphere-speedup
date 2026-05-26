import { ImageIcon, Link2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui-kit";
import { handleInsertLink, isActive, type ToolbarEditorProps } from "../toolbar-utils";

export function QuickInsertGroup({
  editor,
  isReadOnly,
  onToggleComments,
}: ToolbarEditorProps) {
  return (
    <>
      <IconButton
        aria-label="Insert link (⌘⇧K)"
        tooltip="Insert link (⌘⇧K)"
        selected={isActive(editor, "link")}
        disabled={isReadOnly}
        onClick={() => handleInsertLink(editor)}
      >
        <Link2 size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Add comment"
        tooltip="Add comment"
        disabled={isReadOnly}
        onClick={() => onToggleComments?.()}
      >
        <MessageSquare size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Insert image"
        tooltip="Insert image"
        disabled={isReadOnly}
        onClick={() => toast.info("Insert image — coming soon")}
      >
        <ImageIcon size={16} strokeWidth={1.75} />
      </IconButton>
    </>
  );
}
