import { describe, expect, it } from "vitest";
import { buildHeadingSnapshot } from "./document-toc-sync";

describe("buildHeadingSnapshot", () => {
  it("returns empty string when editor is null", () => {
    expect(buildHeadingSnapshot(null)).toBe("");
  });

  it("returns empty string when editor is destroyed", () => {
    expect(
      buildHeadingSnapshot({ isDestroyed: true } as Parameters<typeof buildHeadingSnapshot>[0]),
    ).toBe("");
  });

  it("changes when heading text changes", () => {
    let headingText = "Alpha";
    const editor = {
      isDestroyed: false,
      state: {
        doc: {
          descendants: (
            fn: (
              node: {
                type: { name: string };
                attrs: { level?: number; anchorId?: string };
                textContent: string;
              },
              pos: number,
            ) => boolean | void,
          ) => {
            fn(
              {
                type: { name: "heading" },
                attrs: { level: 1, anchorId: "alpha" },
                textContent: headingText,
              },
              1,
            );
          },
        },
      },
    } as unknown as Parameters<typeof buildHeadingSnapshot>[0];

    const before = buildHeadingSnapshot(editor);
    headingText = "Beta";
    const after = buildHeadingSnapshot(editor);
    expect(before).not.toBe(after);
    expect(before).toContain("Alpha");
    expect(after).toContain("Beta");
  });
});
