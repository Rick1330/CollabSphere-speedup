import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterTree } from "./document-tree-filter.js";
import type { TreeNode } from "@/features/documents/components/document-tree";

const sample: TreeNode[] = [
  {
    type: "folder",
    id: "f1",
    name: "Empty folder",
    children: [],
  },
  {
    type: "folder",
    id: "f2",
    name: "Projects",
    children: [
      {
        type: "document",
        id: "d1",
        title: "Spec",
        status: "draft",
        updatedAt: new Date().toISOString(),
      },
    ],
  },
];

describe("filterTree", () => {
  it("keeps empty folders when no filters are active", () => {
    const out = filterTree(sample, "", "all");
    assert.equal(out.length, 2);
    assert.equal(out[0].type === "folder" && out[0].name, "Empty folder");
  });

  it("hides empty folders when status filter excludes all children", () => {
    const out = filterTree(sample, "", "approved");
    assert.equal(out.length, 0);
  });
});
