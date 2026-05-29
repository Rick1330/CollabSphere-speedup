import {
  Bold,
  Code,
  Italic,
  MoreHorizontal,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import {
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@/components/ui-kit";
import { applyTextCaseTransform, isActive, type ToolbarEditorProps } from "../toolbar-utils";

export function CharacterGroup({ editor, isReadOnly }: ToolbarEditorProps) {
  return (
    <>
      <IconButton
        aria-label="Bold (⌘B)"
        tooltip="Bold (⌘B)"
        selected={isActive(editor, "bold")}
        disabled={isReadOnly}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Italic (⌘I)"
        tooltip="Italic (⌘I)"
        selected={isActive(editor, "italic")}
        disabled={isReadOnly}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Underline (⌘U)"
        tooltip="Underline (⌘U)"
        selected={isActive(editor, "underline")}
        disabled={isReadOnly}
        onClick={() => (editor?.chain().focus() as { toggleUnderline?: () => { run: () => void } })?.toggleUnderline?.().run()}
      >
        <UnderlineIcon size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Strikethrough (⌘⇧X)"
        tooltip="Strikethrough (⌘⇧X)"
        selected={isActive(editor, "strike")}
        disabled={isReadOnly}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} strokeWidth={1.75} />
      </IconButton>
      <IconButton
        aria-label="Inline code"
        tooltip="Inline code"
        selected={isActive(editor, "code")}
        disabled={isReadOnly}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      >
        <Code size={16} strokeWidth={1.75} />
      </IconButton>
      <Menu>
        <MenuTrigger asChild>
          <IconButton aria-label="More character formatting" tooltip="More">
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </IconButton>
        </MenuTrigger>
        <MenuContent align="start">
          <MenuItem
            disabled={isReadOnly}
            onSelect={() => editor?.chain().focus().toggleSubscript().run()}
          >
            Subscript
          </MenuItem>
          <MenuItem
            disabled={isReadOnly}
            onSelect={() => editor?.chain().focus().toggleSuperscript().run()}
          >
            Superscript
          </MenuItem>
          <MenuItem disabled={isReadOnly} onSelect={() => applyTextCaseTransform(editor, "upper")}>
            UPPERCASE
          </MenuItem>
          <MenuItem disabled={isReadOnly} onSelect={() => applyTextCaseTransform(editor, "lower")}>
            lowercase
          </MenuItem>
          <MenuItem disabled={isReadOnly} onSelect={() => applyTextCaseTransform(editor, "title")}>
            Title Case
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
