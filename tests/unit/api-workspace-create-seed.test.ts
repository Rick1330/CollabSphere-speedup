import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";

import { resolveDocumentSeedFromTemplate } from "../../apps/api/src/documents/document-template-seed.service.js";
import { extractPlaintextFromYjsUpdate } from "../../apps/api/src/documents/yjs-plaintext.js";

const readFixture = async (id: string) => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const dir = dirname(fileURLToPath(import.meta.url));
  const raw = await readFile(
    join(dir, "../../packages/database/prisma/template-seeds", `${id}.json`),
    "utf8",
  );
  return JSON.parse(raw) as {
    id: string;
    contentYjsBase64: string;
    contentPlaintext: string;
  };
};

test("golden fixture tpl_doc_academic_rad_v1 yields non-empty Yjs seed", async () => {
  const fixture = await readFixture("tpl_doc_academic_rad_v1");
  const resolved = resolveDocumentSeedFromTemplate({
    id: fixture.id,
    version: 1,
    schemaVersion: 2,
    contentFormat: "document-v2",
    content: {
      schemaVersion: 2,
      format: "document-v2",
      structure: {
        blocks: [],
        yjsSeedBase64: fixture.contentYjsBase64,
        plaintextSeed: fixture.contentPlaintext,
      },
    },
  });

  assert.ok(resolved.contentYjs.byteLength > 100);
  assert.ok(resolved.contentPlaintext.includes("REQUIREMENT ANALYSIS"));

  const roundTrip = extractPlaintextFromYjsUpdate(
    new Uint8Array(Buffer.from(fixture.contentYjsBase64, "base64")),
  );
  assert.ok(roundTrip.includes("REQUIREMENT ANALYSIS"));
});

test("golden fixture tpl_doc_professional_prd_v1 yields non-empty Yjs seed", async () => {
  const fixture = await readFixture("tpl_doc_professional_prd_v1");
  const resolved = resolveDocumentSeedFromTemplate({
    id: fixture.id,
    version: 1,
    schemaVersion: 2,
    contentFormat: "document-v2",
    content: {
      schemaVersion: 2,
      format: "document-v2",
      structure: {
        blocks: [],
        yjsSeedBase64: fixture.contentYjsBase64,
        plaintextSeed: fixture.contentPlaintext,
      },
    },
  });

  assert.ok(resolved.contentYjs.byteLength > 50);
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(resolved.contentYjs));
  assert.ok(ydoc.getXmlFragment("default").length > 0 || ydoc.getXmlFragment("prosemirror").length > 0);
  ydoc.destroy();
});
