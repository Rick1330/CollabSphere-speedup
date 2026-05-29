import assert from "node:assert/strict";
import test from "node:test";
import {
  assignHeadingAnchorIds,
  slugifyHeadingText,
  toHeadingDomId,
} from "../../apps/web/src/features/documents/lib/document-heading-slugs.ts";

test("slugifyHeadingText normalizes titles", () => {
  assert.equal(slugifyHeadingText("Hello World!"), "hello-world");
  assert.equal(slugifyHeadingText("   "), "section");
});

test("assignHeadingAnchorIds disambiguates duplicates", () => {
  assert.deepEqual(assignHeadingAnchorIds(["Intro", "Intro", "Methods"]), [
    "intro",
    "intro-2",
    "methods",
  ]);
});

test("toHeadingDomId prefixes anchor ids", () => {
  assert.equal(toHeadingDomId("my-section"), "cs-h-my-section");
});
