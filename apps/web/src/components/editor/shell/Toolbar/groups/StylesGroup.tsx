import type { Editor } from "@tiptap/react";
import { ChevronDown, RemoveFormatting } from "lucide-react";
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui-kit";
import {
  clearFormatting,
  getActiveStyleLabel,
  STYLE_ITEMS,
  type ToolbarEditorProps,
} from "../toolbar-utils";
import "../styles-gallery.css";

function StylesGalleryMenu({
  editor,
  disabled,
  triggerLabel,
}: {
  editor: Editor;
  disabled?: boolean;
  triggerLabel: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="cs-kit-styles-trigger cs-kit-focus"
          aria-label="Text style"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown size={12} strokeWidth={1.75} className="shrink-0 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="cs-kit-styles-menu">
        <ul className="cs-kit-styles-list" role="listbox" aria-label="Document styles">
          {STYLE_ITEMS.map((item) => {
            const active = item.isActive(editor);
            return (
              <li key={item.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className="cs-kit-styles-item cs-kit-focus"
                  data-active={active ? "true" : undefined}
                  onClick={() => item.apply(editor)}
                >
                  <span className={item.previewClass}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function StylesGroup({ editor, isReadOnly }: ToolbarEditorProps) {
  if (!editor) return null;
  const label = getActiveStyleLabel(editor);
  return (
    <>
      <StylesGalleryMenu editor={editor} disabled={isReadOnly} triggerLabel={label} />
      <IconButton
        aria-label="Clear formatting"
        tooltip="Clear formatting"
        disabled={isReadOnly}
        onClick={() => clearFormatting(editor)}
      >
        <RemoveFormatting size={16} strokeWidth={1.75} />
      </IconButton>
    </>
  );
}
