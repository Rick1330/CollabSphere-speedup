import { describe, expect, it } from "vitest";
import { replaceImageSrcInContent } from "./image-urls.js";

describe("replaceImageSrcInContent", () => {
  it("matches image src by basename when LibreOffice uses a relative path", () => {
    const node = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "./media/image001.png" },
        },
      ],
    };
    const updated = replaceImageSrcInContent(node, "image001.png", "http://localhost/uploads/x.png");
    const image = updated.content?.[0];
    expect(image?.type).toBe("image");
    expect((image?.attrs as { src?: string }).src).toBe("http://localhost/uploads/x.png");
  });
});
