import { describe, expect, it } from "vitest";
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
    expect(out.length).toBe(2);
    expect(out[0].type === "folder" && out[0].name).toBe("Empty folder");
  });

  it("hides empty folders when status filter excludes all children", () => {
    const out = filterTree(sample, "", "approved");
    expect(out.length).toBe(0);
  });
});
