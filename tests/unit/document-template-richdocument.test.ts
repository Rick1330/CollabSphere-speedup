import assert from "node:assert/strict";
import test from "node:test";

import { parseDocumentTemplateContent } from "../../apps/api/src/common/templates/template-schema.js";

test("parseDocumentTemplateContent accepts richdocument with empty blocks and regions", () => {
  const parsed = parseDocumentTemplateContent({
    schemaVersion: 2,
    format: "richdocument",
    metadata: { title: "Pilot" },
    structure: {
      regions: [{ id: "main", key: "main", title: "Main" }],
      variables: [{ key: "docTitle", label: "Title", required: false }],
      blocks: [],
    },
  });
  assert.equal(parsed.format, "richdocument");
  assert.equal(parsed.blocks.length, 0);
  assert.equal(parsed.regions?.length, 1);
  assert.equal(parsed.variables?.length, 1);
  assert.equal(parsed.variables?.[0]?.key, "docTitle");
});
