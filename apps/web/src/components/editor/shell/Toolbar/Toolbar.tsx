import { memo, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  IconButton,
  Menu,
  MenuTrigger,
  Toolbar as KitToolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/ui-kit";
import type { ToolbarEditorProps, ToolbarGroupId } from "./toolbar-utils";
import { useToolbarOverflow } from "./useToolbarOverflow";
import { ToolbarOverflowMenu } from "./ToolbarOverflowMenu";
import { HistoryGroup } from "./groups/HistoryGroup";
import { StylesGroup } from "./groups/StylesGroup";
import { FontGroup } from "./groups/FontGroup";
import { CharacterGroup } from "./groups/CharacterGroup";
import { ColorGroup } from "./groups/ColorGroup";
import { QuickInsertGroup } from "./groups/QuickInsertGroup";
import { ParagraphGroup } from "./groups/ParagraphGroup";
import { ListsGroup } from "./groups/ListsGroup";
import { ReviewGroup } from "./groups/ReviewGroup";
import "./toolbar.css";

export type ToolbarProps = ToolbarEditorProps;

type GroupDef = {
  id: ToolbarGroupId;
  render: () => React.ReactNode;
};

export const Toolbar = memo(function Toolbar({
  editor,
  isReadOnly,
  onInsertTableRequest,
  onToggleComments,
}: ToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenIds = useToolbarOverflow(containerRef);
  const props = { editor, isReadOnly, onInsertTableRequest, onToggleComments };

  const groups: GroupDef[] = [
    { id: "history", render: () => <HistoryGroup {...props} /> },
    { id: "styles", render: () => <StylesGroup {...props} /> },
    { id: "font", render: () => <FontGroup {...props} /> },
    { id: "character", render: () => <CharacterGroup {...props} /> },
    { id: "color", render: () => <ColorGroup {...props} /> },
    { id: "quickInsert", render: () => <QuickInsertGroup {...props} /> },
    { id: "paragraph", render: () => <ParagraphGroup {...props} /> },
    { id: "lists", render: () => <ListsGroup {...props} /> },
    { id: "review", render: () => <ReviewGroup {...props} /> },
  ];

  const visibleGroups = groups.filter((g) => !hiddenIds.includes(g.id));

  return (
    <div ref={containerRef} className="cs-editor-toolbar-wrap">
      <KitToolbar aria-label="Editor toolbar" className="cs-editor-toolbar">
        {visibleGroups.map((group, index) => (
          <div key={group.id} className="contents" data-toolbar-group={group.id}>
            {index > 0 && <ToolbarSeparator />}
            <ToolbarGroup>{group.render()}</ToolbarGroup>
          </div>
        ))}
        <ToolbarSeparator />
        <ToolbarGroup>
          <Menu>
            <MenuTrigger asChild>
              <IconButton aria-label="More formatting options" tooltip="More formatting">
                <MoreHorizontal size={16} strokeWidth={1.75} />
              </IconButton>
            </MenuTrigger>
            <ToolbarOverflowMenu hiddenIds={hiddenIds} {...props} />
          </Menu>
        </ToolbarGroup>
      </KitToolbar>
    </div>
  );
});
