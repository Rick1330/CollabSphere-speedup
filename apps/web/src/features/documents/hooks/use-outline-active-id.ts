import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type { OutlineNode } from "@/features/documents/hooks/use-document-outline";
import type { Editor } from "@tiptap/react";

/**
 * Tracks which outline entry is nearest the top of the scroll viewport
 * using IntersectionObserver on heading DOM nodes.
 */
export function useOutlineActiveId(
  editor: Editor | null,
  outline: OutlineNode[],
  scrollRootRef: RefObject<HTMLElement | null>,
): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!editor || editor.isDestroyed || outline.length === 0) {
      setActiveId(null);
      return;
    }

    const root = scrollRootRef.current;
    if (!root) return;

    const visible = new Map<string, IntersectionObserverEntry>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.outlineId;
          if (!id) return;
          if (entry.isIntersecting) {
            visible.set(id, entry);
          } else {
            visible.delete(id);
          }
        });

        if (visible.size === 0) {
          setActiveId(null);
          return;
        }

        let bestId: string | null = null;
        let bestTop = Number.POSITIVE_INFINITY;
        visible.forEach((entry, id) => {
          const top = entry.boundingClientRect.top;
          if (top < bestTop) {
            bestTop = top;
            bestId = id;
          }
        });
        setActiveId(bestId);
      },
      {
        root,
        rootMargin: "-10% 0px -75% 0px",
        threshold: [0, 0.1, 0.5, 1],
      },
    );

    const observed: HTMLElement[] = [];
    outline.forEach((node) => {
      try {
        const dom = editor.view.nodeDOM(node.pos) as HTMLElement | null;
        if (!dom) return;
        dom.dataset.outlineId = node.id;
        observer.observe(dom);
        observed.push(dom);
      } catch {
        // pos may be stale
      }
    });

    return () => {
      observer.disconnect();
      observed.forEach((el) => {
        delete el.dataset.outlineId;
      });
      visible.clear();
    };
  }, [editor, outline, scrollRootRef]);

  return activeId;
}
