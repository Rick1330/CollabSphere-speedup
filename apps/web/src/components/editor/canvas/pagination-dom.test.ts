import { afterEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { DEFAULT_PAGE_SETUP } from "@/components/editor/canvas/pageSetup";
import {
  buildExplicitPrintRoot,
  collectPrintableBlocksWithPos,
  PRINT_ROOT_ID,
  removeExplicitPrintRoot,
  resolvePageNumberAtPos,
  resolvePageNumberAtY,
} from "./pagination-dom";

function mockEditorWithPageBreaks(
  pageBreaks: HTMLElement[],
  options?: {
    coordsAtPos?: (pos: number) => { top: number; bottom: number; left: number; right: number };
    docBlocks?: Array<{ tag: string; pos: number }>;
  },
): Editor {
  const pagination = document.createElement("div");
  pagination.setAttribute("data-rm-pagination", "true");
  for (const page of pageBreaks) {
    pagination.appendChild(page);
  }

  const dom = document.createElement("div");
  dom.classList.add("ProseMirror", "rm-with-pagination");
  dom.appendChild(pagination);

  const blocks = options?.docBlocks ?? [];
  for (const block of blocks) {
    const el = document.createElement(block.tag);
    dom.appendChild(el);
  }

  const doc = {
    content: { size: Math.max(10, blocks.length * 2 + 2) },
    forEach: (fn: (node: { isBlock: boolean }, offset: number) => void) => {
      let offset = 0;
      for (const block of blocks) {
        fn({ isBlock: true }, offset);
        offset += 2;
      }
    },
  };

  const nodeMap = new Map<number, HTMLElement>();
  blocks.forEach((block, index) => {
    nodeMap.set(index * 2, dom.children[index + 1] as HTMLElement);
  });

  return {
    isDestroyed: false,
    state: { doc, selection: { from: 1 } },
    view: {
      dom,
      coordsAtPos:
        options?.coordsAtPos ??
        ((pos: number) => ({
          top: pos <= 1 ? 50 : 950,
          bottom: pos <= 1 ? 70 : 970,
          left: 0,
          right: 800,
        })),
      nodeDOM: (offset: number) => nodeMap.get(offset) ?? null,
      domAtPos: (pos: number) => {
        const el = dom.children[Math.max(0, pos - 1)] as HTMLElement;
        return { node: el ?? dom, offset: 0 };
      },
    },
  } as Editor;
}

describe("resolvePageNumberAtY", () => {
  it("returns page index from non-overlapping rm-page-break bands", () => {
    const page1 = document.createElement("div");
    page1.className = "rm-page-break";
    const page2 = document.createElement("div");
    page2.className = "rm-page-break";
    const page3 = document.createElement("div");
    page3.className = "rm-page-break";

    Object.defineProperty(page1, "getBoundingClientRect", {
      value: () => ({ top: 0, bottom: 900, left: 0, right: 800, width: 800, height: 900 }),
    });
    Object.defineProperty(page2, "getBoundingClientRect", {
      value: () => ({ top: 900, bottom: 1800, left: 0, right: 800, width: 800, height: 900 }),
    });
    Object.defineProperty(page3, "getBoundingClientRect", {
      value: () => ({ top: 1800, bottom: 2700, left: 0, right: 800, width: 800, height: 900 }),
    });

    const editor = mockEditorWithPageBreaks([page1, page2, page3]);
    expect(resolvePageNumberAtY(editor, 950)).toBe(2);
    expect(resolvePageNumberAtY(editor, 100)).toBe(1);
    expect(resolvePageNumberAtY(editor, 1900)).toBe(3);
  });

  it("uses grid fallback when page-break tops are clustered", () => {
    const page1 = document.createElement("div");
    page1.className = "rm-page-break";
    const page2 = document.createElement("div");
    page2.className = "rm-page-break";
    const page3 = document.createElement("div");
    page3.className = "rm-page-break";

    for (const page of [page1, page2, page3]) {
      Object.defineProperty(page, "getBoundingClientRect", {
        value: () => ({ top: 0, bottom: 900, left: 0, right: 800, width: 800, height: 900 }),
      });
    }

    const editor = mockEditorWithPageBreaks([page1, page2, page3], {
      coordsAtPos: (pos) => ({
        top: pos <= 1 ? 120 : 120 + 1163,
        bottom: pos <= 1 ? 140 : 120 + 1163 + 20,
        left: 0,
        right: 800,
      }),
    });

    expect(resolvePageNumberAtPos(editor, 1, DEFAULT_PAGE_SETUP)).toBe(1);
    expect(resolvePageNumberAtPos(editor, 3, DEFAULT_PAGE_SETUP)).toBe(2);
  });
});

describe("resolvePageNumberAtPos", () => {
  it("returns distinct pages for different document positions", () => {
    const page1 = document.createElement("div");
    page1.className = "rm-page-break";
    const page2 = document.createElement("div");
    page2.className = "rm-page-break";

    Object.defineProperty(page1, "getBoundingClientRect", {
      value: () => ({ top: 100, bottom: 1000, left: 0, right: 800, width: 800, height: 900 }),
    });
    Object.defineProperty(page2, "getBoundingClientRect", {
      value: () => ({ top: 1000, bottom: 1900, left: 0, right: 800, width: 800, height: 900 }),
    });

    const editor = mockEditorWithPageBreaks([page1, page2], {
      coordsAtPos: (pos) => ({
        top: pos <= 1 ? 150 : 1100,
        bottom: pos <= 1 ? 170 : 1120,
        left: 0,
        right: 800,
      }),
    });

    expect(resolvePageNumberAtPos(editor, 1)).toBe(1);
    expect(resolvePageNumberAtPos(editor, 3)).toBe(2);
  });
});

describe("collectPrintableBlocksWithPos", () => {
  it("returns top-level blocks with positions", () => {
    const editor = mockEditorWithPageBreaks([], {
      docBlocks: [
        { tag: "h1", pos: 1 },
        { tag: "p", pos: 3 },
      ],
    });

    const blocks = collectPrintableBlocksWithPos(editor);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].pos).toBe(1);
    expect(blocks[0].el.tagName).toBe("H1");
    expect(blocks[1].pos).toBe(3);
    expect(blocks[1].el.tagName).toBe("P");
  });
});

describe("buildExplicitPrintRoot", () => {
  afterEach(() => {
    removeExplicitPrintRoot();
  });

  it("creates one cs-print-page shell per pagination page", () => {
    const page1 = document.createElement("div");
    page1.className = "rm-page-break";
    const page2 = document.createElement("div");
    page2.className = "rm-page-break";
    const page3 = document.createElement("div");
    page3.className = "rm-page-break";

    for (const [page, top] of [
      [page1, 100],
      [page2, 1000],
      [page3, 1900],
    ] as const) {
      Object.defineProperty(page, "getBoundingClientRect", {
        value: () => ({
          top,
          bottom: top + 900,
          left: 0,
          right: 800,
          width: 800,
          height: 900,
        }),
      });
    }

    const editor = mockEditorWithPageBreaks([page1, page2, page3], {
      docBlocks: [
        { tag: "h1", pos: 1 },
        { tag: "p", pos: 3 },
        { tag: "h2", pos: 5 },
      ],
      coordsAtPos: (pos) => ({
        top: pos <= 1 ? 150 : pos <= 3 ? 160 : 1100,
        bottom: pos <= 1 ? 170 : pos <= 3 ? 180 : 1120,
        left: 0,
        right: 800,
      }),
    });

    const root = buildExplicitPrintRoot(editor, DEFAULT_PAGE_SETUP);
    expect(root.id).toBe(PRINT_ROOT_ID);
    expect(root.querySelectorAll(".cs-print-page")).toHaveLength(3);
    expect(root.querySelectorAll(".cs-print-page")[0].querySelector("h1")).not.toBeNull();
    expect(root.querySelectorAll(".cs-print-page")[1].querySelector("h2")).not.toBeNull();
  });

  it("removes print root on cleanup", () => {
    const page1 = document.createElement("div");
    page1.className = "rm-page-break";
    Object.defineProperty(page1, "getBoundingClientRect", {
      value: () => ({ top: 0, bottom: 900, left: 0, right: 800, width: 800, height: 900 }),
    });

    const editor = mockEditorWithPageBreaks([page1], {
      docBlocks: [{ tag: "p", pos: 1 }],
    });

    buildExplicitPrintRoot(editor, DEFAULT_PAGE_SETUP);
    expect(document.getElementById(PRINT_ROOT_ID)).not.toBeNull();
    removeExplicitPrintRoot();
    expect(document.getElementById(PRINT_ROOT_ID)).toBeNull();
  });
});
