import { ImageIcon, Link2, ListTree, MessageSquare, Table as TableIcon, Workflow } from "lucide-react";
import { IconButton } from "@/components/ui-kit";
import {
  handleInsertImage,
  handleInsertLink,
  handleInsertMermaid,
  isActive,
  type ToolbarEditorProps,
} from "../toolbar-utils";

export function QuickInsertGroup({
  editor,
  isReadOnly,
  onInsertTableRequest,
  onInsertTOCRequest,
  onInsertLinkRequest,
  onToggleComments,
  imageInsertContext,
}: ToolbarEditorProps) {
  const canInsertImage = Boolean(imageInsertContext?.workspaceId && imageInsertContext.documentId);

  return (
    <>
      <IconButton
        aria-label="Insert link (⌘⇧K)"
        tooltip="Insert link (⌘⇧K)"
        selected={isActive(editor, "link")}
        disabled={isReadOnly}
        onClick={() => handleInsertLink(editor, onInsertLinkRequest)}
      >
        <Link2 size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Insert diagram"
        tooltip="Insert diagram (Mermaid)"
        disabled={isReadOnly}
        onClick={() => handleInsertMermaid(editor)}
      >
        <Workflow size={16} strokeWidth={1.75} />
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
        disabled={isReadOnly || !canInsertImage}
        onClick={() => handleInsertImage(editor, imageInsertContext)}
      >
        <ImageIcon size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Insert table"
        tooltip="Insert table"
        selected={isActive(editor, "table")}
        disabled={isReadOnly}
        onClick={onInsertTableRequest}
      >
        <TableIcon size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Insert table of contents"
        tooltip="Table of contents"
        selected={isActive(editor, "tocBlock")}
        disabled={isReadOnly}
        onClick={onInsertTOCRequest}
      >
        <ListTree size={16} strokeWidth={1.75} />
      </IconButton>
    </>
  );
}
