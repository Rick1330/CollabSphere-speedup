import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/react";
import { resolvePaginationPlusPageCount } from "../measurePaginationPlusLayout";

describe("resolvePaginationPlusPageCount", () => {
  it("returns 1 when editor is null", () => {
    expect(resolvePaginationPlusPageCount(null)).toBe(1);
  });

  it("counts pagination children in the DOM", () => {
    const pagination = document.createElement("div");
    pagination.setAttribute("data-rm-pagination", "");
    pagination.appendChild(document.createElement("div"));
    pagination.appendChild(document.createElement("div"));

    const dom = document.createElement("div");
    dom.appendChild(pagination);

    const editor = {
      isDestroyed: false,
      view: { dom },
    } as unknown as Editor;

    expect(resolvePaginationPlusPageCount(editor)).toBe(2);
  });

  it("returns at least 1 when pagination root is missing", () => {
    const editor = {
      isDestroyed: false,
      view: { dom: document.createElement("div") },
    } as unknown as Editor;

    expect(resolvePaginationPlusPageCount(editor)).toBe(1);
  });
});
