/**
 * Files API adapter.
 *
 * Canonical surface for the workspace files library. Reads and helpers
 * the UI consumes are re-exported here so pages stop reaching into the
 * underlying mock fixture directly.
 */
import { MOCK_FILES, type FileItem } from "@/lib/mock-files";

export {
  MOCK_FILES,
  formatBytes,
  type FileItem,
  type FileKind,
} from "@/lib/mock-files";

/** Async list endpoint — returns live data when `GET /workspaces/:id/files` exists. */
export async function listWorkspaceFiles(_workspaceId: string): Promise<FileItem[]> {
  void _workspaceId;
  // TODO(api): GET /workspaces/:id/files — until then, show an empty library (no mock rows).
  return [];
}
