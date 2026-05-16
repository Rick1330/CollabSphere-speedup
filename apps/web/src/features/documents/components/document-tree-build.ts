import type { TreeDocumentNode, TreeFolderNode, TreeNode } from "./document-tree-types";

type ApiFolder = {
  id: string;
  name: string;
  parentId?: string | null;
};

type ApiDocument = {
  id: string;
  title: string;
  folderId?: string | null;
  status: TreeDocumentNode["status"];
  isLocked?: boolean;
  updatedAt: string;
};

export function buildTree(folders: ApiFolder[], documents: ApiDocument[]): TreeNode[] {
  const folderNodes = new Map<string, TreeFolderNode>();
  for (const folder of folders) {
    folderNodes.set(folder.id, {
      type: "folder",
      id: folder.id,
      name: folder.name,
      children: [],
    });
  }
  const root: TreeNode[] = [];
  for (const folder of folders) {
    const node = folderNodes.get(folder.id);
    if (!node) continue;
    if (folder.parentId && folderNodes.has(folder.parentId)) {
      folderNodes.get(folder.parentId)?.children.push(node);
    } else {
      root.push(node);
    }
  }
  for (const document of documents) {
    const docNode: TreeDocumentNode = {
      type: "document",
      id: document.id,
      title: document.title,
      status: document.status,
      isLocked: Boolean(document.isLocked),
      updatedAt: document.updatedAt,
    };
    if (document.folderId && folderNodes.has(document.folderId)) {
      folderNodes.get(document.folderId)?.children.push(docNode);
    } else {
      root.push(docNode);
    }
  }
  return root;
}
