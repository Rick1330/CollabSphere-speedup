import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import { syncPageDimensions } from "../usePaginationPlusSync";
import { normalizePageSetup } from "../pageSetup";

function createMockEditor() {
  const updatePageSize = vi.fn();
  const chain = {
    updatePageGap: vi.fn().mockReturnThis(),
    updatePageBreakBackground: vi.fn().mockReturnThis(),
    updateContentMargins: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };

  const editor = {
    isDestroyed: false,
    commands: { updatePageSize, updateHeaderContent: vi.fn(), updateFooterContent: vi.fn() },
    chain: () => chain,
  } as unknown as Editor;

  return { editor, updatePageSize, chain };
}

describe("syncPageDimensions", () => {
  it("calls updatePageSize with Letter dimensions", () => {
    const { editor, updatePageSize } = createMockEditor();
    const letter = normalizePageSetup({ format: "letter", orientation: "portrait" });

    syncPageDimensions(editor, letter);

    expect(updatePageSize).toHaveBeenCalledWith({
      pageWidth: 816,
      pageHeight: 1056,
      marginTop: 96,
      marginBottom: 96,
      marginLeft: 96,
      marginRight: 96,
    });
  });
});
