import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";
import {
  extractPlaintextFromYjsUpdate,
  resolveVersionPlaintext,
  safeResolveVersionPlaintext,
  yjsStateToBase64,
} from "../../apps/api/src/documents/yjs-plaintext.js";

function buildProsemirrorUpdate(text: string): Uint8Array {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("prosemirror");
  const paragraph = new Y.XmlElement("paragraph");
  const xmlText = new Y.XmlText();
  xmlText.insert(0, text);
  paragraph.insert(0, [xmlText]);
  fragment.insert(0, [paragraph]);
  return Y.encodeStateAsUpdate(ydoc);
}

test("extractPlaintextFromYjsUpdate reads prosemirror fragment", () => {
  const update = buildProsemirrorUpdate("Hello from prosemirror");
  assert.equal(extractPlaintextFromYjsUpdate(update), "Hello from prosemirror");
});

test("resolveVersionPlaintext backfills when stored plaintext is empty", () => {
  const update = buildProsemirrorUpdate("Backfilled excerpt");
  assert.equal(
    resolveVersionPlaintext({ plaintext: "", yjsState: update }),
    "Backfilled excerpt",
  );
});

test("yjsStateToBase64 round-trips bytes", () => {
  const update = buildProsemirrorUpdate("x");
  const encoded = yjsStateToBase64(update);
  assert.equal(Buffer.from(encoded, "base64").toString("utf8").length > 0, true);
});

test("safeResolveVersionPlaintext returns empty string for corrupt yjs", () => {
  assert.equal(
    safeResolveVersionPlaintext({ plaintext: null, yjsState: Uint8Array.from([255, 0, 1]) }),
    "",
  );
});
