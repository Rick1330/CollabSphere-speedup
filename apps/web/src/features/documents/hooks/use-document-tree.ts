/**
 * Loads the document tree for a workspace via the API adapter (React Query).
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  createDocument,
  createWorkspaceFolder,
  deleteDocument,
  deleteWorkspaceFolder,
  getDocumentTree,
  updateDocumentMetadata,
  updateWorkspaceFolder,
  type TreeNode,
} from "@/api/adapters/documents";
import { ApiError } from "@/api/client";

export type { TreeNode };
export type DocumentTreeState = "loading" | "loaded" | "error";

export function documentTreeQueryKey(workspaceId: string) {
  return ["workspace", workspaceId, "document-tree"] as const;
}

export function invalidateDocumentTree(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
) {
  void queryClient.invalidateQueries({ queryKey: documentTreeQueryKey(workspaceId) });
}

export interface UseDocumentTreeResult {
  tree: TreeNode[];
  state: DocumentTreeState;
  reload: () => void;
}

export function useDocumentTree(workspaceId: string): UseDocumentTreeResult {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: documentTreeQueryKey(workspaceId),
    queryFn: () => getDocumentTree(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 5_000,
  });

  const state: DocumentTreeState = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : "loaded";

  return {
    tree: query.data ?? [],
    state,
    reload: () => {
      invalidateDocumentTree(queryClient, workspaceId);
    },
  };
}

export function useDocumentTreeMutations(workspaceId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const invalidate = useCallback(() => {
    invalidateDocumentTree(queryClient, workspaceId);
  }, [queryClient, workspaceId]);

  const handleApiError = (e: unknown, fallback: string) => {
    const msg = e instanceof ApiError ? e.message : fallback;
    toast.error(msg);
  };

  return {
    invalidate,
    createFolder: async (name: string, parentId: string | null) => {
      await createWorkspaceFolder(workspaceId, { name: name.trim(), parentId });
      invalidate();
      toast.success(`Created folder "${name.trim()}"`);
    },
    renameFolder: async (folderId: string, name: string) => {
      await updateWorkspaceFolder(workspaceId, folderId, { name: name.trim() });
      invalidate();
      toast.success("Folder renamed");
    },
    moveFolder: async (folderId: string, parentId: string | null) => {
      await updateWorkspaceFolder(workspaceId, folderId, { parentId });
      invalidate();
      toast.success("Folder moved");
    },
    deleteFolder: async (folderId: string, folderName: string) => {
      await deleteWorkspaceFolder(workspaceId, folderId);
      invalidate();
      toast.success(`Deleted folder "${folderName}"`);
    },
    createDocument: async (
      title: string,
      folderId: string | null,
      options?: { open?: boolean; templateId?: string | null },
    ) => {
      const created = await createDocument(workspaceId, {
        title: title.trim(),
        folderId,
        templateId: options?.templateId ?? null,
      });
      invalidate();
      toast.success(`Created "${title.trim()}"`);
      if (options?.open !== false) {
        navigate(`/w/${workspaceId}/documents/${created.id}`);
      }
      return created;
    },
    renameDocument: async (documentId: string, title: string) => {
      await updateDocumentMetadata(workspaceId, documentId, { title: title.trim() });
      invalidate();
      toast.success("Document renamed");
    },
    moveDocument: async (documentId: string, folderId: string | null) => {
      await updateDocumentMetadata(workspaceId, documentId, { folderId });
      invalidate();
      toast.success("Document moved");
    },
    deleteDocument: async (documentId: string, title: string) => {
      await deleteDocument(workspaceId, documentId);
      invalidate();
      toast.success(`Deleted "${title}"`);
    },
    handleApiError,
  };
}
