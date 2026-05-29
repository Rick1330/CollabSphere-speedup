import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyPrintPageVariables,
  clearPrintPageVariables,
  prepareEditorForPrint,
  releaseLayoutClippingForPrint,
  restoreLayoutClipping,
} from "./print-document";
import * as documentToc from "./document-toc";
import * as editorScrollContainer from "./editor-scroll-container";
import {
  PRINT_ROOT_ID,
  removeExplicitPrintRoot,
} from "@/components/editor/canvas/pagination-dom";

const setup = {
  format: "a4",
  orientation: "portrait",
  margins: { top: 96, right: 96, bottom: 96, left: 96 },
} as const;

describe("print-document css variables", () => {
  it("sets print variables", () => {
    applyPrintPageVariables(setup);
    expect(document.documentElement.style.getPropertyValue("--print-page-size")).toContain("A4");
    expect(document.documentElement.style.getPropertyValue("--print-page-margin-left")).toBe("96px");
  });

  it("clears print variables", () => {
    applyPrintPageVariables(setup);
    clearPrintPageVariables();
    expect(document.documentElement.style.getPropertyValue("--print-page-size")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--print-page-margin-left")).toBe("");
  });
});

describe("releaseLayoutClippingForPrint", () => {
  afterEach(() => {
    restoreLayoutClipping();
  });

  it("unclips overflow on ancestors and restores on cleanup", () => {
    const parent = document.createElement("div");
    parent.style.overflow = "hidden";
    parent.style.height = "400px";
    const child = document.createElement("div");
    parent.appendChild(child);
    document.body.appendChild(parent);

    releaseLayoutClippingForPrint(child);
    expect(parent.style.getPropertyValue("overflow")).toBe("visible");

    restoreLayoutClipping();
    expect(parent.style.overflow).toBe("hidden");

    document.body.removeChild(parent);
  });
});

describe("prepareEditorForPrint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    removeExplicitPrintRoot();
  });

  it("waits for pagination idle and scrolls canvas to top", async () => {
    const waitSpy = vi.spyOn(documentToc, "waitForPaginationIdle").mockResolvedValue(undefined);
    const scroller = { scrollTop: 400 };
    vi.spyOn(editorScrollContainer, "getEditorScrollContainer").mockReturnValue(
      scroller as HTMLElement,
    );

    await prepareEditorForPrint();
    expect(waitSpy).toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(0);
  });

  it("builds explicit print root when editor and pageSetup are provided", async () => {
    const page1 = document.createElement("div");
    page1.className = "rm-page-break";
    const pagination = document.createElement("div");
    pagination.setAttribute("data-rm-pagination", "true");
    pagination.appendChild(page1);

    const prose = document.createElement("div");
    prose.classList.add("ProseMirror");
    const p = document.createElement("p");
    p.textContent = "Hello";
    prose.append(pagination, p);

    const column = document.createElement("div");
    column.className = "cs-paginated-canvas-outer";
    column.appendChild(prose);
    document.body.appendChild(column);

    Object.defineProperty(page1, "getBoundingClientRect", {
      value: () => ({ top: 0, bottom: 900, left: 0, right: 800, width: 800, height: 900 }),
    });

    const editor = {
      isDestroyed: false,
      state: {
        doc: {
          content: { size: 4 },
          forEach: (fn: (node: { isBlock: boolean }, offset: number) => void) => {
            fn({ isBlock: true }, 0);
          },
        },
      },
      view: {
        dom: prose,
        coordsAtPos: () => ({ top: 50, bottom: 70, left: 0, right: 800 }),
        nodeDOM: () => p,
        domAtPos: () => ({ node: p, offset: 0 }),
      },
    } as import("@tiptap/react").Editor;

    vi.spyOn(documentToc, "waitForPaginationIdle").mockResolvedValue(undefined);

    await prepareEditorForPrint({ editor, pageSetup: setup });
    expect(document.getElementById(PRINT_ROOT_ID)).not.toBeNull();
    expect(document.querySelectorAll("#cs-print-root .cs-print-page")).toHaveLength(1);

    removeExplicitPrintRoot();
    document.body.removeChild(column);
  });
});
