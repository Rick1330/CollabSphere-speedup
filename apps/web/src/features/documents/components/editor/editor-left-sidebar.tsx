import { useEffect } from "react";
import { BarChart3, FolderTree, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeftPanelContent, type LeftPanelContentProps } from "@/components/editor/left/panels/LeftPanelContent";
import {
  EditorRailShell,
  EditorRailTabs,
  type EditorRailTabItem,
} from "@/features/documents/components/editor/editor-rail-chrome";
import {
  useEditorStore,
  type LeftSidebarTab,
} from "@/features/documents/stores/use-editor-store";

const LEFT_TABS: EditorRailTabItem[] = [
  { id: "files", label: "Files", icon: FolderTree },
  { id: "outline", label: "Outline", icon: ListTree },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

type EditorLeftSidebarProps = LeftPanelContentProps & {
  className?: string;
};

/** Legacy wrapper — prefer LeftRail + LeftPanel + LeftPanelContent in DocumentEditor. */
export const EditorLeftSidebar = ({
  className,
  ...contentProps
}: EditorLeftSidebarProps) => {
  const leftSidebarTab = useEditorStore((s) => s.leftSidebarTab);
  const setLeftSidebarTab = useEditorStore((s) => s.setLeftSidebarTab);
  const hydrateLeftSidebarTab = useEditorStore((s) => s.hydrateLeftSidebarTab);

  useEffect(() => {
    hydrateLeftSidebarTab();
  }, [hydrateLeftSidebarTab]);

  return (
    <EditorRailShell aria-label="Editor sidebar" className={cn("border-r", className)}>
      <EditorRailTabs
        tabs={LEFT_TABS}
        activeId={leftSidebarTab}
        onChange={(id) => setLeftSidebarTab(id as LeftSidebarTab)}
        aria-label="Left sidebar"
      />
      <LeftPanelContent {...contentProps} activeTab={leftSidebarTab} />
    </EditorRailShell>
  );
};
