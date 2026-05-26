import { useState } from "react";
import { Highlighter } from "lucide-react";
import {
  ColorPicker,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@/components/ui-kit";
import { useRecentColors } from "@/components/editor/hooks/useRecentColors";
import { isActive, type ToolbarEditorProps } from "../toolbar-utils";

export function ColorGroup({ editor, isReadOnly }: ToolbarEditorProps) {
  const { recentColors, addRecentColor } = useRecentColors();
  const [textOpen, setTextOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  if (!editor) return null;

  const currentTextColor =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "#111827";
  const currentHighlight =
    (editor.getAttributes("highlight").color as string | undefined) ?? "#FEF08A";

  const applyTextColor = (hex: string) => {
    if (hex.toUpperCase() === "#111827") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(hex).run();
    }
    addRecentColor(hex);
    setTextOpen(false);
  };

  const applyHighlight = (hex: string) => {
    editor.chain().focus().toggleHighlight({ color: hex }).run();
    addRecentColor(hex);
    setHighlightOpen(false);
  };

  return (
    <>
      <Popover
        open={textOpen}
        onOpenChange={(open) => {
          setHighlightOpen(false);
          setTextOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isReadOnly}
            aria-label="Text color"
            aria-expanded={textOpen}
            className={cn(
              "cs-kit-color-split-trigger cs-kit-focus",
              textOpen && "cs-kit-color-split-trigger--open",
            )}
          >
            <span style={{ color: currentTextColor, fontWeight: 700 }}>A</span>
            <span className="cs-kit-color-split-chevron" aria-hidden>
              ▼
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="cs-kit-color-popover">
          <ColorPicker
            value={currentTextColor}
            onChange={applyTextColor}
            onClear={() => {
              editor.chain().focus().unsetColor().run();
              setTextOpen(false);
            }}
            recentColors={recentColors}
            onRecentAdd={addRecentColor}
          />
        </PopoverContent>
      </Popover>

      <Popover
        open={highlightOpen}
        onOpenChange={(open) => {
          setTextOpen(false);
          setHighlightOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <IconButton
            aria-label="Highlight"
            tooltip="Highlight"
            selected={isActive(editor, "highlight") || highlightOpen}
            disabled={isReadOnly}
          >
            <Highlighter size={16} strokeWidth={1.75} />
          </IconButton>
        </PopoverTrigger>
        <PopoverContent align="start" className="cs-kit-color-popover">
          <ColorPicker
            value={currentHighlight}
            onChange={applyHighlight}
            onClear={() => {
              editor.chain().focus().unsetHighlight().run();
              setHighlightOpen(false);
            }}
            recentColors={recentColors}
            onRecentAdd={addRecentColor}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
