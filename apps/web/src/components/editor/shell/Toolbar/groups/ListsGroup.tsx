import { CheckSquare, List, ListOrdered } from "lucide-react";
import { IconButton } from "@/components/ui-kit";
import { isActive, type ToolbarEditorProps } from "../toolbar-utils";

export function ListsGroup({ editor, isReadOnly }: ToolbarEditorProps) {
  return (
    <>
      <IconButton
        aria-label="Bullet list (⌘⇧8)"
        tooltip="Bullet list (⌘⇧8)"
        selected={isActive(editor, "bulletList")}
        disabled={isReadOnly}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <List size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Ordered list (⌘⇧7)"
        tooltip="Ordered list (⌘⇧7)"
        selected={isActive(editor, "orderedList")}
        disabled={isReadOnly}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Checklist"
        tooltip="Checklist"
        selected={isActive(editor, "taskList")}
        disabled={isReadOnly}
        onClick={() => editor?.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare size={16} strokeWidth={1.75} />
      </IconButton>
    </>
  );
}

