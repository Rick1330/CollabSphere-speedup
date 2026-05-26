import assert from "node:assert/strict";
import test from "node:test";
import { formatCharDelta } from "../../apps/web/src/features/documents/lib/version-char-delta.ts";

test("formatCharDelta shows no text changes for zero delta", () => {
  assert.equal(formatCharDelta(0), "No text changes");
});

test("formatCharDelta shows signed character deltas", () => {
  assert.equal(formatCharDelta(25), "+5 characters");
  assert.equal(formatCharDelta(-10), "-2 characters");
});
