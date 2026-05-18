import { describe, expect, it } from "vitest";
import {
  isContextRailVisible,
  isDocumentTreeVisible,
  toggleContextRailPanel,
  toggleDocumentTreePanel,
} from "./editor-panel-toggles";

describe("toggleContextRailPanel", () => {
  it("opens the sheet below lg without changing desktop collapse state", () => {
    expect(
      toggleContextRailPanel(true, { contextRailCollapsed: true, mobileCommentsOpen: false }),
    ).toEqual({
      layout: "sheet",
      contextRailCollapsed: true,
      mobileCommentsOpen: true,
    });
  });

  it("toggles inline rail at lg and above", () => {
    expect(
      toggleContextRailPanel(false, { contextRailCollapsed: false, mobileCommentsOpen: false }),
    ).toEqual({
      layout: "inline",
      contextRailCollapsed: true,
      mobileCommentsOpen: false,
    });
  });
});

describe("toggleDocumentTreePanel", () => {
  it("toggles the tree sheet below lg", () => {
    expect(toggleDocumentTreePanel(true, { treeOpen: true, mobileTreeOpen: true })).toEqual({
      layout: "sheet",
      treeOpen: true,
      mobileTreeOpen: false,
    });
  });

  it("toggles inline tree at lg and above", () => {
    expect(toggleDocumentTreePanel(false, { treeOpen: false, mobileTreeOpen: false })).toEqual({
      layout: "inline",
      treeOpen: true,
      mobileTreeOpen: false,
    });
  });
});

describe("panel visibility helpers", () => {
  it("derives context rail visibility from sheet or inline state", () => {
    expect(
      isContextRailVisible(true, { contextRailCollapsed: true, mobileCommentsOpen: true }),
    ).toBe(true);
    expect(
      isContextRailVisible(false, { contextRailCollapsed: false, mobileCommentsOpen: false }),
    ).toBe(true);
  });

  it("derives tree visibility from sheet or inline state", () => {
    expect(isDocumentTreeVisible(true, { treeOpen: false, mobileTreeOpen: true })).toBe(true);
    expect(isDocumentTreeVisible(false, { treeOpen: true, mobileTreeOpen: false })).toBe(true);
  });
});
