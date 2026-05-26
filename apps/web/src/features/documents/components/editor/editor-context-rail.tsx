/**
 * EditorContextRail — right context pane: Comments | Team | Tasks | Activity.
 * @deprecated Prefer RightRail + RightPanel + RightPanelContent in DocumentEditor.
 */
import { useEffect } from "react";
import { CheckSquare, History, MessageSquare, Users } from "lucide-react";
import {
  RightPanelContent,
  type RightPanelCommentData,
  type RightPanelContentProps,
} from "@/components/editor/right/panels/RightPanelContent";
import {
  EditorRailShell,
  EditorRailTabs,
  type EditorRailTabItem,
} from "@/features/documents/components/editor/editor-rail-chrome";
import {
  useEditorStore,
  type RightSidebarTab,
} from "@/features/documents/stores/use-editor-store";

const RIGHT_TABS: EditorRailTabItem[] = [
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "team", label: "Team", icon: Users },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "activity", label: "Activity", icon: History },
];

export type EditorContextRailCommentData = RightPanelCommentData;

type EditorContextRailProps = RightPanelContentProps;

export const EditorContextRail = ({
  activeTab: activeTabProp,
  onTabChange,
  ...contentProps
}: EditorContextRailProps) => {
  const storeTab = useEditorStore((s) => s.rightSidebarTab);
  const setStoreTab = useEditorStore((s) => s.setRightSidebarTab);
  const hydrateRightSidebarTab = useEditorStore((s) => s.hydrateRightSidebarTab);

  useEffect(() => {
    hydrateRightSidebarTab();
  }, [hydrateRightSidebarTab]);

  const activeTab = activeTabProp ?? storeTab;

  const handleTabChange = (id: string) => {
    const tab = id as RightSidebarTab;
    setStoreTab(tab);
    onTabChange?.(tab);
  };

  return (
    <EditorRailShell aria-label="Document context" showAccentStrip className="border-l">
      <EditorRailTabs
        tabs={RIGHT_TABS}
        activeId={activeTab}
        onChange={handleTabChange}
        aria-label="Context panel"
      />
      <RightPanelContent {...contentProps} activeTab={activeTab} onTabChange={onTabChange} />
    </EditorRailShell>
  );
};

export type { DocumentLinkedTaskEntry } from "@/features/documents/hooks/use-document-linked-tasks";
