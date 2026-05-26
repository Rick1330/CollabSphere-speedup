import { useEffect, useMemo, useState, type CSSProperties, type RefObject } from "react";
import type { Editor } from "@tiptap/react";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { DocumentShadcnOutlineTree } from "@/features/documents/components/tree/document-shadcn-outline-tree";
import type { OutlineRailItem } from "@/features/documents/components/editor/editor-outline-rail";
import {
  EditorRailCountChip,
  EditorRailSearch,
} from "@/features/documents/components/editor/editor-rail-chrome";
import {
  scrollToOutlineNode,
  useDocumentOutline,
} from "@/features/documents/hooks/use-document-outline";
import { useOutlineActiveId } from "@/features/documents/hooks/use-outline-active-id";
import { useV2DocumentOutline } from "@/features/documents/hooks/use-v2-document-outline";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

interface EditorLeftSidebarOutlineTabProps {
  editor: Editor | null;
  isV2Template: boolean;
  scrollRootRef: RefObject<HTMLElement | null>;
}

export const EditorLeftSidebarOutlineTab = ({
  editor,
  isV2Template,
  scrollRootRef,
}: EditorLeftSidebarOutlineTabProps) => {
  const [search, setSearch] = useState("");
  const headingOutline = useDocumentOutline(isV2Template ? null : editor);
  const v2Outline = useV2DocumentOutline(isV2Template ? editor : null);
  const rawOutline = isV2Template ? v2Outline : headingOutline;
  const outline = useDebouncedValue(rawOutline, 300);
  const activeId = useOutlineActiveId(editor, outline, scrollRootRef);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return outline as OutlineRailItem[];
    return outline.filter((n) => n.text.toLowerCase().includes(q)) as OutlineRailItem[];
  }, [outline, search]);

  const handleJump = (node: { pos: number }) => {
    if (!editor) return;
    scrollToOutlineNode(editor, node.pos);
  };

  return (
    <div className="editor-outline-sidebar flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2.5 border-b border-[var(--editor-border)] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--editor-text-secondary)]">
            Document map
          </h3>
          <EditorRailCountChip>{filtered.length}</EditorRailCountChip>
        </div>
        <EditorRailSearch
          value={search}
          onChange={setSearch}
          placeholder={isV2Template ? "Search regions…" : "Search headings…"}
          aria-label="Filter outline"
        />
      </div>
      <SidebarProvider
        className="flex min-h-0 w-full flex-1"
        style={{ "--sidebar-width": "100%" } as CSSProperties}
      >
        <Sidebar collapsible="none" className="h-full w-full border-0 bg-transparent">
          <SidebarContent className="min-h-0 gap-0 overflow-y-auto p-0">
            <DocumentShadcnOutlineTree
              outline={filtered}
              activeId={activeId}
              isV2Template={isV2Template}
              searchQuery={search}
              onJump={handleJump}
            />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </div>
  );
};
