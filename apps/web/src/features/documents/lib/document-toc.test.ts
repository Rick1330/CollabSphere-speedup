import { describe, expect, it, vi } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { buildTocEntries, buildTocNumbering, resolveBlockInsertPos } from "./document-toc";
import type { DocumentHeading } from "./document-headings";
import * as paginationDom from "@/components/editor/canvas/pagination-dom";

const headings: DocumentHeading[] = [
  { pos: 1, level: 1, text: "Introduction", anchorId: "introduction" },
  { pos: 2, level: 2, text: "Background", anchorId: "background" },
  { pos: 3, level: 1, text: "Results", anchorId: "results" },
];

describe("resolveBlockInsertPos", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { group: "block", content: "text*" },
      text: { group: "inline" },
      table: { group: "block", content: "table_row+" },
      table_row: { content: "(table_cell | table_header)+" },
      table_cell: { content: "paragraph+" },
      table_header: { content: "paragraph+" },
    },
  });

  it("inserts after table when cursor is inside a cell", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("before")]),
      schema.node("table", null, [
        schema.node("table_row", null, [
          schema.node("table_cell", null, [
            schema.node("paragraph", null, [schema.text("cell")]),
          ]),
        ]),
      ]),
      schema.node("paragraph", null, [schema.text("after")]),
    ]);
    const state = EditorState.create({ doc });

    let tableEnd = 0;
    let cellTextPos = 0;
    doc.descendants((node, pos) => {
      if (node.type.name === "table") {
        tableEnd = pos + node.nodeSize;
      }
      if (node.isText && node.text === "cell") {
        cellTextPos = pos + 1;
      }
    });

    const insertPos = resolveBlockInsertPos(state, cellTextPos);
    expect(insertPos).toBe(tableEnd);
  });
});

describe("buildTocNumbering", () => {
  it("builds hierarchical prefixes", () => {
    const map = buildTocNumbering(headings, [1, 2]);
    expect(map.get("introduction")).toBe("1");
    expect(map.get("background")).toBe("1.1");
    expect(map.get("results")).toBe("2");
  });
});

describe("buildTocEntries", () => {
  it("includes all document headings regardless of TOC placement", () => {
    const entries = buildTocEntries(headings, {
      includedLevels: [1, 2, 3],
      style: "flat",
      showPageNumbers: false,
      editor: null,
    });
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.text)).toEqual(["Introduction", "Background", "Results"]);
  });

  it("filters by included levels", () => {
    const entries = buildTocEntries(headings, {
      includedLevels: [1],
      style: "flat",
      showPageNumbers: false,
      editor: null,
    });
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.text)).toEqual(["Introduction", "Results"]);
  });

  it("applies numbered labels", () => {
    const entries = buildTocEntries(headings, {
      includedLevels: [1, 2],
      style: "numbered",
      showPageNumbers: false,
      editor: null,
    });
    expect(entries[0].label).toBe("1 Introduction");
    expect(entries[1].label).toBe("1.1 Background");
  });

  it("assigns distinct page numbers per heading", () => {
    const pageSpy = vi
      .spyOn(paginationDom, "resolvePageNumberAtPos")
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(5);

    const editor = { isDestroyed: false, view: { dom: document.createElement("div") } };
    const entries = buildTocEntries(headings, {
      includedLevels: [1, 2, 3],
      style: "flat",
      showPageNumbers: true,
      editor: editor as import("@tiptap/react").Editor,
    });

    expect(entries.map((e) => e.pageNumber)).toEqual([1, 3, 5]);
    expect(pageSpy).toHaveBeenCalledTimes(3);
    pageSpy.mockRestore();
  });
});
