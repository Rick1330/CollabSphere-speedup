import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDocumentTemplateContent,
  parseTemplateEnvelopeV2,
} from "../../apps/api/src/common/templates/template-schema.js";

test("parseTemplateEnvelopeV2 validates supported format", () => {
  const parsed = parseTemplateEnvelopeV2({
    raw: {
      schemaVersion: 2,
      format: "structured",
      metadata: { title: "Template" },
      structure: { blocks: [] },
    },
    allowedFormats: ["structured", "workspace-v2"],
  });

  assert.equal(parsed.schemaVersion, 2);
  assert.equal(parsed.format, "structured");
  assert.equal((parsed.metadata as { title: string }).title, "Template");
});

test("parseDocumentTemplateContent parses structured blocks", () => {
  const parsed = parseDocumentTemplateContent({
    schemaVersion: 2,
    format: "document-v2",
    metadata: { title: "Proposal" },
    properties: { audience: "board" },
    structure: {
      blocks: [
        { type: "cover-page", attrs: { title: "{{workspaceName}}" } },
        { type: "section", content: [{ type: "paragraph" }] },
      ],
    },
  });

  assert.equal(parsed.blocks.length, 2);
  assert.equal(parsed.blocks[0]?.type, "cover-page");
  assert.equal((parsed.blocks[0]?.attrs as { title: string }).title, "{{workspaceName}}");
});

test("parseDocumentTemplateContent rejects invalid blocks", () => {
  assert.throws(
    () =>
      parseDocumentTemplateContent({
        schemaVersion: 2,
        format: "document-v2",
        structure: {
          blocks: [{ attrs: { title: "Missing type" } }],
        },
      }),
    /TEMPLATE_INVALID|Template/i,
  );
});
