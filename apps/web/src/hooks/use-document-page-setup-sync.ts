import { useEffect, useRef } from "react";
import type * as Y from "yjs";
import {
  normalizePageSetup,
  type PageSetup,
} from "@/components/editor/canvas/pageSetup";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";

const META_KEY = "pageSetup";

function pageSetupEquals(a: PageSetup, b: PageSetup): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Sync document-level page setup via Y.Map `meta.pageSetup`.
 * Remote wins after sync; localStorage remains a fallback when offline.
 */
export function useDocumentPageSetupSync(ydoc: Y.Doc | null, synced: boolean): void {
  const isApplyingRemote = useRef(false);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);

  useEffect(() => {
    if (!ydoc || !synced) return;

    const yMeta = ydoc.getMap("meta");

    const readRemote = (): PageSetup | null => {
      const raw = yMeta.get(META_KEY);
      if (!raw || typeof raw !== "object") return null;
      return normalizePageSetup(raw as Partial<PageSetup>);
    };

    const applyRemote = () => {
      const remote = readRemote();
      if (!remote) return;
      const local = useEditorStore.getState().pageSetup;
      if (pageSetupEquals(remote, local)) return;
      isApplyingRemote.current = true;
      setPageSetup(remote);
      queueMicrotask(() => {
        isApplyingRemote.current = false;
      });
    };

    const remote = readRemote();
    if (remote) {
      applyRemote();
    } else {
      const local = useEditorStore.getState().pageSetup;
      ydoc.transact(() => {
        yMeta.set(META_KEY, local);
      });
    }

    const onMetaChange = () => {
      applyRemote();
    };

    yMeta.observe(onMetaChange);

    const unsub = useEditorStore.subscribe((state, prev) => {
      if (isApplyingRemote.current) return;
      if (pageSetupEquals(state.pageSetup, prev.pageSetup)) return;
      const currentRemote = readRemote();
      if (currentRemote && pageSetupEquals(state.pageSetup, currentRemote)) return;
      ydoc.transact(() => {
        yMeta.set(META_KEY, state.pageSetup);
      });
    });

    return () => {
      yMeta.unobserve(onMetaChange);
      unsub();
    };
  }, [ydoc, synced, setPageSetup]);
}
