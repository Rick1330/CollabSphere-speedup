export type EditorPanelLayout = "sheet" | "inline";

export function toggleContextRailPanel(
  isBelowLg: boolean,
  state: { contextRailCollapsed: boolean; mobileCommentsOpen: boolean },
): {
  layout: EditorPanelLayout;
  contextRailCollapsed: boolean;
  mobileCommentsOpen: boolean;
} {
  if (isBelowLg) {
    return {
      layout: "sheet",
      contextRailCollapsed: state.contextRailCollapsed,
      mobileCommentsOpen: !state.mobileCommentsOpen,
    };
  }
  return {
    layout: "inline",
    contextRailCollapsed: !state.contextRailCollapsed,
    mobileCommentsOpen: state.mobileCommentsOpen,
  };
}

export function toggleDocumentTreePanel(
  isBelowLg: boolean,
  state: { treeOpen: boolean; mobileTreeOpen: boolean },
): {
  layout: EditorPanelLayout;
  treeOpen: boolean;
  mobileTreeOpen: boolean;
} {
  if (isBelowLg) {
    return {
      layout: "sheet",
      treeOpen: state.treeOpen,
      mobileTreeOpen: !state.mobileTreeOpen,
    };
  }
  return {
    layout: "inline",
    treeOpen: !state.treeOpen,
    mobileTreeOpen: state.mobileTreeOpen,
  };
}

export function isContextRailVisible(
  isBelowLg: boolean,
  state: { contextRailCollapsed: boolean; mobileCommentsOpen: boolean },
): boolean {
  return isBelowLg ? state.mobileCommentsOpen : !state.contextRailCollapsed;
}

export function isDocumentTreeVisible(
  isBelowLg: boolean,
  state: { treeOpen: boolean; mobileTreeOpen: boolean },
): boolean {
  return isBelowLg ? state.mobileTreeOpen : state.treeOpen;
}
