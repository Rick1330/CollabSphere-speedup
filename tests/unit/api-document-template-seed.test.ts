import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";

import {
  extractYjsSeedBase64FromTemplateContent,
  resolveDocumentSeedFromTemplate,
} from "../../apps/api/src/documents/document-template-seed.service.js";
import { extractPlaintextFromYjsUpdate } from "../../apps/api/src/documents/yjs-plaintext.js";

const buildSampleYjsBase64 = () => {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("default");
  const paragraph = new Y.XmlElement("paragraph");
  const text = new Y.XmlText();
  text.insert(0, "Template seed body");
  paragraph.insert(0, [text]);
  fragment.insert(0, [paragraph]);
  const update = Y.encodeStateAsUpdate(ydoc);
  ydoc.destroy();
  return Buffer.from(update).toString("base64");
};

test("extractYjsSeedBase64FromTemplateContent reads structure.yjsSeedBase64", () => {
  const seed = extractYjsSeedBase64FromTemplateContent({
    schemaVersion: 2,
    structure: { yjsSeedBase64: "abc123" },
  });
  assert.equal(seed, "abc123");
});

test("resolveDocumentSeedFromTemplate decodes yjs seed and builds properties", () => {
  const yjsSeedBase64 = buildSampleYjsBase64();
  const resolved = resolveDocumentSeedFromTemplate({
    id: "tpl_doc_test_v1",
    version: 1,
    schemaVersion: 2,
    contentFormat: "document-v2",
    content: {
      schemaVersion: 2,
      format: "document-v2",
      structure: {
        blocks: [{ type: "paragraph", content: [{ type: "text", text: "fallback" }] }],
        yjsSeedBase64,
        plaintextSeed: "Plain seed",
      },
    },
  });

  assert.ok(resolved.contentYjs.byteLength > 0);
  assert.equal(resolved.contentPlaintext.includes("Plain seed"), true);
  const props = resolved.templateProperties as Record<string, unknown>;
  assert.equal((props.template as { id: string }).id, "tpl_doc_test_v1");
  assert.equal(Array.isArray(props.blocks), true);
  assert.equal(typeof props.templateSeededAt, "string");

  const roundTrip = extractPlaintextFromYjsUpdate(
    new Uint8Array(Buffer.from(yjsSeedBase64, "base64")),
  );
  assert.equal(roundTrip.includes("Template seed body"), true);
});

test("resolveDocumentSeedFromTemplate uses empty yjs when no seed present", () => {
  const resolved = resolveDocumentSeedFromTemplate({
    id: "tpl_doc_blank_v1",
    version: 1,
    schemaVersion: 2,
    contentFormat: "document-v2",
    content: {
      schemaVersion: 2,
      format: "document-v2",
      structure: { blocks: [] },
    },
  });
  assert.ok(resolved.contentYjs.byteLength >= 0);
  assert.equal(resolved.contentPlaintext, "");
});
