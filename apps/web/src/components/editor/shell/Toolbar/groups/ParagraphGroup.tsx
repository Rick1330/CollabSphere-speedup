import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  IndentDecrease,
  IndentIncrease,
  LineChart,
} from "lucide-react";
import { IconButton } from "@/components/ui-kit";
import {
  cycleLineHeight,
  getLineHeight,
  handleIndentDecrease,
  handleIndentIncrease,
  isActive,
  type ToolbarEditorProps,
} from "../toolbar-utils";

const ALIGNMENTS = [
  { align: "left" as const, label: "Align left", Icon: AlignLeft },
  { align: "center" as const, label: "Align center", Icon: AlignCenter },
  { align: "right" as const, label: "Align right", Icon: AlignRight },
  { align: "justify" as const, label: "Justify", Icon: AlignJustify },
];

export function ParagraphGroup({ editor, isReadOnly }: ToolbarEditorProps) {
  if (!editor) return null;

  const lineHeight = getLineHeight(editor);

  return (
    <>
      {ALIGNMENTS.map(({ align, label, Icon }) => (
        <IconButton
          key={align}
          aria-label={label}
          tooltip={label}
          selected={isActive(editor, "textAlign", { textAlign: align })}
          disabled={isReadOnly}
          onClick={() =>
            (editor.chain().focus() as { setTextAlign?: (a: string) => { run: () => boolean } })
              .setTextAlign?.(align)
              .run()
          }
        >
          <Icon size={16} strokeWidth={1.75} />
        </IconButton>
      ))}
      <IconButton
        aria-label={`Line spacing (${lineHeight})`}
        tooltip={`Line spacing: ${lineHeight} — click to cycle`}
        disabled={isReadOnly}
        onClick={() => cycleLineHeight(editor)}
      >
        <LineChart size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Decrease indent"
        tooltip="Decrease indent"
        disabled={isReadOnly}
        onClick={() => handleIndentDecrease(editor)}
      >
        <IndentDecrease size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Increase indent"
        tooltip="Increase indent"
        disabled={isReadOnly}
        onClick={() => handleIndentIncrease(editor)}
      >
        <IndentIncrease size={16} strokeWidth={1.75} />
      </IconButton>
    </>
  );
}
