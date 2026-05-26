import { Clipboard, Copy, Scissors } from "lucide-react";
import { IconButton, SplitButton } from "@/components/ui-kit";
import {
  copyEditorSelection,
  cutEditorSelection,
  pastePlainText,
  type ToolbarEditorProps,
} from "../toolbar-utils";

export function ClipboardGroup({ editor, isReadOnly }: ToolbarEditorProps) {
  const runAsync = (fn: () => Promise<void>) => {
    void fn().catch(() => {
      /* clipboard may be denied without user gesture */
    });
  };

  return (
    <>
      <SplitButton
        label="Paste"
        disabled={isReadOnly}
        onPrimaryClick={() => runAsync(() => pastePlainText(editor))}
        menuItems={[
          {
            id: "plain",
            label: "Paste without formatting",
            onSelect: () => runAsync(() => pastePlainText(editor)),
          },
        ]}
        icon={<Clipboard size={14} strokeWidth={1.75} />}
      />
      <IconButton
        aria-label="Cut"
        tooltip="Cut"
        disabled={isReadOnly}
        onClick={() => runAsync(() => cutEditorSelection(editor))}
      >
        <Scissors size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Copy"
        tooltip="Copy"
        disabled={isReadOnly}
        onClick={() => runAsync(() => copyEditorSelection(editor))}
      >
        <Copy size={16} strokeWidth={1.75} />
      </IconButton>
    </>
  );
}
