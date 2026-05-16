import type { TreeDocumentNode, TreeFolderNode, TreeNode } from "./document-tree-types";

export type DocStatus = TreeDocumentNode["status"];

export const filterTree = (
  nodes: TreeNode[],
  query: string,
  status: "all" | DocStatus,
): TreeNode[] => {
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
};

export const countDocs = (nodes: TreeNode[]): number => {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "document") count++;
    else count += countDocs(node.children);
  }
  return count;
};

export const collectFolderIds = (nodes: TreeNode[], target: Set<string>) => {
  for (const node of nodes) {
    if (node.type === "folder") {
      target.add(node.id);
      collectFolderIds(node.children, target);
    }
  }
};

export const countFolders = (nodes: TreeNode[]): number => {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "folder") {
      count++;
      count += countFolders(node.children);
    }
  }
  return count;
};
