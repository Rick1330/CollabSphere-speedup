import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { DEFAULT_PAGE_SETUP, PAGE_GAP_PX, getPageContentBox } from "../pageSetup";
import { measureDocumentPages, PAGE_BREAK_NODE_NAME } from "./measureDocumentPages";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "text*",
      toDOM: () => ["p", 0],
    },
    pageBreakBlock: {
      group: "block",
      atom: true,
      toDOM: () => ["div", { "data-type": "page-break-block" }],
    },
    text: { group: "inline" },
  },
});

function blockPositions(doc: ReturnType<typeof schema.node>): number[] {
  const positions: number[] = [];
  doc.forEach((node, offset) => {
    if (node.isBlock) positions.push(offset + 1);
  });
  return positions;
}

function mockView(
  doc: ReturnType<typeof schema.node>,
  heights: Record<number, number>,
): EditorView {
  const state = EditorState.create({ schema, doc });
  const dom = document.createElement("div");
  const view = {
    state,
    dom,
    nodeDOM: (pos: number) => {
      const el = document.createElement("p");
      Object.defineProperty(el, "offsetHeight", {
        value: heights[pos] ?? 24,
        configurable: true,
      });
      return el;
    },
    isDestroyed: false,
  } as unknown as EditorView;
  return view;
}

describe("measureDocumentPages", () => {
  const { contentHeight, pageHeight } = getPageContentBox(DEFAULT_PAGE_SETUP);

  it("returns one page for short content", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("Hello")]),
    ]);
    const [p1] = blockPositions(doc);
    const view = mockView(doc, { [p1]: 40 });
    const result = measureDocumentPages(view, 500, DEFAULT_PAGE_SETUP);
    expect(result.pageCount).toBe(1);
    expect(result.pageStarts).toEqual([1]);
    expect(result.pageBreaks).toHaveLength(0);
    expect(result.pageTops).toEqual([0]);
  });

  it("splits when cumulative height exceeds content height with dynamic spacer", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("A")]),
      schema.node("paragraph", null, [schema.text("B")]),
    ]);
    const [p1, p2] = blockPositions(doc);
    const view = mockView(doc, { [p1]: 300, [p2]: 300 });
    const result = measureDocumentPages(view, 400, DEFAULT_PAGE_SETUP);
    expect(result.pageCount).toBe(2);
    expect(result.pageStarts[1]).toBe(p2);
    expect(result.pageBreaks).toHaveLength(1);
    expect(result.pageBreaks[0].pos).toBe(p2);
    expect(result.pageBreaks[0].spacerHeight).toBe(100 + PAGE_GAP_PX);
    expect(result.pageTops).toEqual([0, pageHeight + PAGE_GAP_PX]);
  });

  it("honors hard page break nodes with spacer", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("A")]),
      schema.node(PAGE_BREAK_NODE_NAME),
      schema.node("paragraph", null, [schema.text("B")]),
    ]);
    const [p1, breakPos, p3] = blockPositions(doc);
    const view = mockView(doc, { [p1]: 40, [breakPos]: 20, [p3]: 40 });
    const result = measureDocumentPages(view, contentHeight, DEFAULT_PAGE_SETUP);
    expect(result.pageCount).toBe(2);
    expect(result.pageStarts).toContain(breakPos);
    expect(result.pageBreaks[0].pos).toBe(breakPos);
    expect(result.pageBreaks[0].spacerHeight).toBeGreaterThan(PAGE_GAP_PX);
  });
});
