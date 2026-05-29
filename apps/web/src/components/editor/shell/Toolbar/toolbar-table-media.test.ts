import { describe, expect, it, vi } from "vitest";
import { buildToolbarChildProps } from "./Toolbar";
import {
  runTableCommand,
  setSelectedImageAlign,
  setSelectedImageWidth,
} from "./toolbar-utils";

vi.mock("@/api/adapters/document-images", () => ({
  uploadDocumentImage: vi.fn(),
}));

function createMockEditor(callLog: string[]) {
  const chainObj = {
    focus: () => chainObj,
    addRowBefore: () => ({ run: () => (callLog.push("addRowBefore"), true) }),
    setImageAlign: (value: string) => ({ run: () => (callLog.push(`align:${value}`), true) }),
    setImageWidth: (value: number) => ({ run: () => (callLog.push(`width:${value}`), true) }),
  };

  return {
    isDestroyed: false,
    chain: () => chainObj,
    isActive: () => false,
  } as any;
}

describe("table/media toolbar helpers", () => {
  it("forwards onInsertTOCRequest to toolbar child props", () => {
    const onInsertTOCRequest = vi.fn();
    const props = buildToolbarChildProps({
      editor: null,
      isReadOnly: false,
      onInsertTableRequest: vi.fn(),
      onInsertTOCRequest,
      onOpenTablePropertiesRequest: vi.fn(),
      onInsertLinkRequest: vi.fn(),
    });
    expect(props.onInsertTOCRequest).toBe(onInsertTOCRequest);
  });

  it("runs table command", () => {
    const log: string[] = [];
    const editor = createMockEditor(log);
    runTableCommand(editor, "addRowBefore");
    expect(log).toEqual(["addRowBefore"]);
  });

  it("sets image align", () => {
    const log: string[] = [];
    const editor = createMockEditor(log);
    setSelectedImageAlign(editor, "right");
    expect(log).toEqual(["align:right"]);
  });

  it("rounds image width to 5%", () => {
    const log: string[] = [];
    const editor = createMockEditor(log);
    setSelectedImageWidth(editor, 77);
    expect(log).toEqual(["width:75"]);
  });
});
