import { Eye, MessageSquare, SpellCheck } from "lucide-react";
import { IconButton } from "@/components/ui-kit";
import { EditorModeSwitcher } from "../../EditorModeSwitcher";
import type { ToolbarEditorProps } from "../toolbar-utils";

export function ReviewGroup({ isReadOnly, onToggleComments }: ToolbarEditorProps) {
  return (
    <>
      <IconButton
        aria-label="Show comments"
        tooltip="Show comments"
        onClick={() => onToggleComments?.()}
      >
        <MessageSquare size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Show changes"
        tooltip="Track changes — coming in a later phase"
        disabled
      >
        <Eye size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Spelling"
        tooltip="Spell check — coming soon"
        disabled
      >
        <SpellCheck size={16} strokeWidth={1.75} />
      </IconButton>
      <div className="cs-editor-toolbar-mode-switcher hidden xl:block">
        <EditorModeSwitcher isReadOnly={isReadOnly} />
      </div>
    </>
  );
}
