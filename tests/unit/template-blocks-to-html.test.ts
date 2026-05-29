import assert from "node:assert/strict";
import test from "node:test";

import { templateBlocksToHtml } from "../../apps/web/src/features/documents/lib/template-blocks-to-html.ts";

test("templateBlocksToHtml renders headings and paragraphs", () => {
  const html = templateBlocksToHtml([
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Title" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Body copy" }],
    },
  ]);
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /<p>Body copy<\/p>/);
});
