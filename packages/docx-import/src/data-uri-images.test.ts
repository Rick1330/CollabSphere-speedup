import { describe, expect, it } from "vitest";
import { extractDataUriImagesFromHtml } from "./data-uri-images.js";

describe("extractDataUriImagesFromHtml", () => {
  it("replaces data URI img src with inline filename and returns buffer map", () => {
    const tiny = Buffer.from("hi").toString("base64");
    const html = `<p><img src="data:image/png;base64,${tiny}" alt="x" /></p>`;
    const { html: out, images } = extractDataUriImagesFromHtml(html);
    expect(out).toContain('src="inline-0.png"');
    expect(out).not.toContain("data:image");
    expect(images.size).toBe(1);
    expect(images.get("inline-0.png")?.toString()).toBe("hi");
  });
});
