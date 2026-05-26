import assert from "node:assert/strict";
import test from "node:test";
import { decodeYjsState } from "../../apps/web/src/features/documents/lib/decode-yjs-state.ts";

test("decodeYjsState handles base64 strings", () => {
  const bytes = decodeYjsState(Buffer.from([9, 8, 7]).toString("base64"));
  assert.deepEqual(Array.from(bytes), [9, 8, 7]);
});

test("decodeYjsState handles Node Buffer JSON", () => {
  const bytes = decodeYjsState({ type: "Buffer", data: [4, 5, 6] });
  assert.deepEqual(Array.from(bytes), [4, 5, 6]);
});

test("decodeYjsState handles number arrays", () => {
  const bytes = decodeYjsState([1, 2, 3]);
  assert.deepEqual(Array.from(bytes), [1, 2, 3]);
});

test("decodeYjsState returns empty array for nullish input", () => {
  const bytes = decodeYjsState(null);
  assert.equal(bytes.byteLength, 0);
});
