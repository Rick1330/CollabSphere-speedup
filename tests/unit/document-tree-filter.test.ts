import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterTree } from "../../apps/web/src/features/documents/components/document-tree-filter.js";
import type { TreeNode } from "../../apps/web/src/features/documents/components/document-tree-types.js";

const sampleTree: TreeNode[] = [
  {
    type: "folder",
    id: "f1",
    name: "Empty folder",
    children: [],
  },
  {
    type: "folder",
    id: "f2",
    name: "With doc",
    children: [
      {
        type: "document",
        id: "d1",
        title: "Draft doc",
        status: "draft",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ],
  },
];

describe("filterTree", () => {
  it("keeps empty folders when no search or status filter is active", () => {
    const result = filterTree(sampleTree, "", "all");
    assert.equal(result.length, 2);
    assert.equal(result[0]?.type, "folder");
    if (result[0]?.type === "folder") {
      assert.equal(result[0].children.length, 0);
    }
  });

  it("prunes empty folders when a status filter is active", () => {
    const result = filterTree(sampleTree, "", "approved");
    assert.equal(result.length, 0);
  });

  it("matches folder names when searching", () => {
    const result = filterTree(sampleTree, "empty", "all");
    assert.equal(result.length, 1);
    if (result[0]?.type === "folder") {
      assert.equal(result[0].name, "Empty folder");
    }
  });
});
