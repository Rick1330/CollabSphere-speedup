import type { JSONContent } from "@tiptap/core";
import type { DocxImportMetadata } from "./docx-types.js";

export function buildImportMetadata(content: JSONContent): DocxImportMetadata {
  let wordCount = 0;
  let characterCount = 0;
  let hasImages = false;
  let hasTables = false;
  let pageCount = 1;

  const walk = (node: JSONContent) => {
    if (node.type === "text" && node.text) {
      const words = node.text.split(/\s+/).filter(Boolean);
      wordCount += words.length;
      characterCount += node.text.length;
    }
    if (node.type === "image") hasImages = true;
    if (node.type === "table") hasTables = true;
    if (node.type === "pageBreakBlock") pageCount += 1;
    node.content?.forEach(walk);
  };

  walk(content);

  return {
    pageCount: Math.max(1, pageCount),
    wordCount,
    characterCount,
    hasImages,
    hasTables,
  };
}
