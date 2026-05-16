import type { TreeNode } from "@/features/documents/components/document-tree";

export type DocStatus = "draft" | "submitted" | "changes_requested" | "approved" | "archived";

/** Filters tree by search query and document status; keeps empty folders when no filters are active. */
export function filterTree(
  nodes: TreeNode[],
  query: string,
  status: "all" | DocStatus,
): TreeNode[] {
  const q = query.trim().toLowerCase();
  const noActiveFilter = q.length === 0 && status === "all";
  const next: TreeNode[] = [];

  for (const node of nodes) {
    if (node.type === "document") {
      const matchesQuery = q.length === 0 || node.title.toLowerCase().includes(q);
      const matchesStatus = status === "all" || node.status === status;
      if (matchesQuery && matchesStatus) {
        next.push(node);
      }
      continue;
    }

    const children = filterTree(node.children, query, status);
    const folderMatches = q.length > 0 && node.name.toLowerCase().includes(q);
    if (noActiveFilter || children.length > 0 || folderMatches) {
      next.push({
        ...node,
        children: noActiveFilter ? node.children : children,
      });
    }
  }

  return next;
}
