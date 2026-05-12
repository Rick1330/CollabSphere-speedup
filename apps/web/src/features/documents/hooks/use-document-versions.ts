/**
 * Loads version history for a single document via the API adapter.
 */
import { useEffect, useState } from "react";
import {
  listDocumentVersions,
  type DocumentVersion,
} from "@/api/adapters/documents";

export type VersionsState = "loading" | "loaded" | "error";

export function useDocumentVersions(workspaceId: string, documentId: string) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [state, setState] = useState<VersionsState>("loading");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    listDocumentVersions(workspaceId, documentId)
      .then((data) => {
        if (cancelled) return;
        setVersions(data);
        setState("loaded");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, documentId, tick]);

  return {
    versions,
    state,
    setVersions,
    reload: () => setTick((t) => t + 1),
  };
}
