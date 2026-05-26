import { describe, expect, it } from "vitest";
import type { EditorView } from "@tiptap/pm/view";
import { createFocusParagraphPlugin } from "./focusParagraphPlugin";

describe("createFocusParagraphPlugin", () => {
  it("view hook does not register an update handler that dispatches transactions", () => {
    const plugin = createFocusParagraphPlugin(true, () => null);
    const viewFactory = plugin.spec.view;
    expect(viewFactory).toBeDefined();

    const hooks =
      typeof viewFactory === "function"
        ? viewFactory({ isDestroyed: false } as EditorView)
        : viewFactory;

    expect(hooks?.update).toBeUndefined();
  });
});
