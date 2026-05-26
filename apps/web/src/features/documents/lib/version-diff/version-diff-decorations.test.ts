import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import {
  buildVersionDiffDecorations,
  summarizeVersionDiff,
} from "@/features/documents/lib/version-diff/version-diff-decorations";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

function docFromParagraphText(text: string) {
  return schema.node("doc", null, [
    schema.node("paragraph", null, text ? [schema.text(text)] : []),
  ]);
}

function docFromParagraphs(texts: string[]) {
  return schema.node(
    "doc",
    null,
    texts.map((text) =>
      schema.node("paragraph", null, text ? [schema.text(text)] : []),
    ),
  );
}

describe("version diff decorations", () => {
  it("summarizes changes between paragraph snapshots", () => {
    const oldDoc = docFromParagraphText("hello");
    const newDoc = docFromParagraphText("hello world");
    const summary = summarizeVersionDiff(oldDoc, newDoc);
    expect(summary.insertions + summary.modifications + summary.deletions).toBeGreaterThan(0);
  });

  it("builds decorations for inserted text", () => {
    const oldDoc = docFromParagraphText("alpha");
    const newDoc = docFromParagraphText("alpha beta");
    const { decorations, failed } = buildVersionDiffDecorations(oldDoc, newDoc);
    expect(failed).toBe(false);
    expect(decorations.find().length).toBeGreaterThan(0);
  });

  it("highlights a removed section without marking the whole document", () => {
    const oldDoc = docFromParagraphs(["Section A", "Section B", "Section C"]);
    const newDoc = docFromParagraphs(["Section A", "Section C"]);
    const { decorations, failed } = buildVersionDiffDecorations(oldDoc, newDoc);
    expect(failed).toBe(false);
    expect(decorations.find().length).toBeGreaterThan(0);
    expect(decorations.find().length).toBeLessThan(30);
  });
});
