import {
  BarChart3,
  FileText,
  Footprints,
  ImageIcon,
  Info,
  Layout,
  Link2,
  MessageSquarePlus,
  MoreHorizontal,
  Scissors,
  Sigma,
  Table as TableIcon,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import {
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui-kit";
import { handleInsertLink, isActive, type ToolbarEditorProps } from "../toolbar-utils";

type ChainEditor = {
  chain: () => {
    focus: () => {
      insertMermaidBlock?: () => { run: () => void };
      insertMathBlock?: () => { run: () => void };
      insertCallout?: () => { run: () => void };
      insertSection?: () => { run: () => void };
      insertCoverPage?: () => { run: () => void };
      insertPageBreak?: () => { run: () => void };
    };
  };
};

export function InsertGroup({ editor, isReadOnly, onInsertTableRequest }: ToolbarEditorProps) {
  const chainEditor = editor as ChainEditor | null;

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
        aria-label="Insert image"
        tooltip="Insert image"
        disabled={isReadOnly}
        onClick={() => toast.info("Insert image — coming soon")}
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
      <Menu>
        <MenuTrigger asChild>
          <IconButton aria-label="More insert options" tooltip="More insert">
            <MoreHorizontal size={16} strokeWidth={1.75} />
          </IconButton>
        </MenuTrigger>
        <MenuContent align="start" className="min-w-[12rem]">
          <MenuItem disabled={isReadOnly} onSelect={() => toast.info("Insert chart — coming soon")}>
            <BarChart3 size={16} className="mr-2 opacity-70" />
            Chart
          </MenuItem>
          <MenuItem
            disabled={isReadOnly}
            onSelect={() => chainEditor?.chain().focus().insertMathBlock?.().run()}
          >
            <Sigma size={16} className="mr-2 opacity-70" />
            Equation
          </MenuItem>
          <MenuItem disabled={isReadOnly} onSelect={() => toast.info("Use selection comment trigger or ⌘⌥M")}>
            <MessageSquarePlus size={16} className="mr-2 opacity-70" />
            Comment
          </MenuItem>
          <MenuItem disabled={isReadOnly} onSelect={() => toast.info("Footnotes — coming soon")}>
            <Footprints size={16} className="mr-2 opacity-70" />
            Footnote
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            disabled={isReadOnly}
            onSelect={() => chainEditor?.chain().focus().insertPageBreak?.().run()}
          >
            <Scissors size={16} className="mr-2 opacity-70" />
            Page break
          </MenuItem>
          <MenuItem
            disabled={isReadOnly}
            onSelect={() => chainEditor?.chain().focus().insertMermaidBlock?.().run()}
          >
            <Workflow size={16} className="mr-2 opacity-70" />
            Diagram (Mermaid)
          </MenuItem>
          <MenuItem disabled={isReadOnly} onSelect={() => chainEditor?.chain().focus().insertCallout?.().run()}>
            <Info size={16} className="mr-2 opacity-70" />
            Callout
          </MenuItem>
          <MenuItem disabled={isReadOnly} onSelect={() => chainEditor?.chain().focus().insertSection?.().run()}>
            <Layout size={16} className="mr-2 opacity-70" />
            Section
          </MenuItem>
          <MenuItem disabled={isReadOnly} onSelect={() => chainEditor?.chain().focus().insertCoverPage?.().run()}>
            <FileText size={16} className="mr-2 opacity-70" />
            Cover page
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
