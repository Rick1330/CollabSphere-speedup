export type DocStatus = "draft" | "submitted" | "changes_requested" | "approved" | "archived";

export interface TreeDocumentNode {
  type: "document";
  id: string;
  title: string;
  status: DocStatus;
  isLocked?: boolean;
  lockedBy?: { fullName: string };
  updatedAt: string;
}

export interface TreeFolderNode {
  type: "folder";
  id: string;
  name: string;
  children: TreeNode[];
}

export type TreeNode = TreeFolderNode | TreeDocumentNode;

export interface TreePermissions {
  canCreate: boolean;
  canOrganize: boolean;
  canDelete: boolean;
}

export function treePermissionsFromRole(role: string, workspaceActive: boolean): TreePermissions {
  const active = workspaceActive;
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return { canCreate: active, canOrganize: active, canDelete: active };
    case "MANAGER":
    case "SUPERVISOR":
      return { canCreate: active, canOrganize: active, canDelete: active };
    case "MEMBER":
    case "STUDENT":
      return { canCreate: active, canOrganize: active, canDelete: false };
    default:
      return { canCreate: false, canOrganize: false, canDelete: false };
  }
}
