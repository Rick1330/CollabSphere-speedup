import { describe, expect, it } from "vitest";
import { tiptapJsonToYjsUpdate } from "./tiptap-to-yjs.js";

describe("tiptapJsonToYjsUpdate", () => {
  it("encodes imported content with remote http links (not data URIs)", () => {
    const update = tiptapJsonToYjsUpdate({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Figure 1",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "http://localhost:9000/documents/doc-1/image1.png",
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(update.length).toBeGreaterThan(0);
    const encoded = new TextDecoder().decode(update);
    expect(encoded.includes("data:")).toBe(false);
    expect(encoded.includes("localhost:9000")).toBe(true);
  });
});
