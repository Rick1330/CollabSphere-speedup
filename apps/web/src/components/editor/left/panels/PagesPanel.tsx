import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { toPng } from "html-to-image";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";
import { EditorRailSection } from "@/features/documents/components/editor/editor-rail-chrome";
import { cn } from "@/components/ui-kit";

const THUMB_MAX_WIDTH = 120;

type PageThumbProps = {
  editor: Editor;
  pageIndex: number;
  active: boolean;
  cache: Map<number, string>;
  onCache: (index: number, dataUrl: string) => void;
  onSelect: () => void;
};

function PageThumb({ editor, pageIndex, active, cache, onCache, onSelect }: PageThumbProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(() => cache.get(pageIndex) ?? null);
  const generatingRef = useRef(false);

  useEffect(() => {
    setThumbUrl(cache.get(pageIndex) ?? null);
  }, [cache, pageIndex]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || editor.isDestroyed) return;

    const generate = async () => {
      if (generatingRef.current || cache.has(pageIndex)) return;
      const pagination = editor.view.dom.querySelector("[data-rm-pagination]");
      const pageEl = pagination?.children[pageIndex] as HTMLElement | undefined;
      if (!pageEl) return;

      generatingRef.current = true;
      try {
        const width = pageEl.offsetWidth;
        const scale = width > 0 ? Math.min(1, THUMB_MAX_WIDTH / width) : 0.2;
        const dataUrl = await toPng(pageEl, {
          cacheBust: true,
          pixelRatio: 1,
          width: Math.max(1, Math.round(pageEl.offsetWidth * scale)),
          height: Math.max(1, Math.round(pageEl.offsetHeight * scale)),
          style: { transform: `scale(${scale})`, transformOrigin: "top left" },
        });
        onCache(pageIndex, dataUrl);
        setThumbUrl(dataUrl);
      } catch {
        /* thumbnail optional */
      } finally {
        generatingRef.current = false;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void generate();
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, [editor, pageIndex, cache, onCache]);

  const n = pageIndex + 1;

  return (
    <li ref={rowRef}>
      <button
        type="button"
        className={cn(
          "flex w-full flex-col gap-1.5 rounded-md border px-2 py-2 text-left transition-colors",
          active
            ? "border-[var(--brand-400)] bg-[var(--brand-50)]"
            : "border-[var(--border-subtle)] bg-[var(--surface-0)] hover:border-[var(--border-default)]",
        )}
        onClick={onSelect}
      >
        <div className="flex min-h-[72px] items-center justify-center overflow-hidden rounded bg-[var(--surface-2)]">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className="max-h-[100px] max-w-full object-contain"
              draggable={false}
            />
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">Page {n}</span>
          )}
        </div>
        <span
          className={cn(
            "text-[length:var(--text-sm-size)]",
            active ? "text-[var(--text-strong)]" : "text-[var(--text-default)]",
          )}
        >
          Page {n}
        </span>
      </button>
    </li>
  );
}

export function PagesPanel({ editor }: { editor: Editor | null }) {
  const pageCount = useEditorStore((s) => s.paginationPageCount);
  const currentPage = useEditorStore((s) => s.paginationCurrentPage);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const thumbCacheRef = useRef(new Map<number, string>());
  const [, bumpCache] = useState(0);

  useEffect(() => {
    thumbCacheRef.current.clear();
    bumpCache((n) => n + 1);
  }, [pageCount, pageSetup]);

  const onCache = useCallback((index: number, dataUrl: string) => {
    thumbCacheRef.current.set(index, dataUrl);
    bumpCache((n) => n + 1);
  }, []);

  const scrollToPage = (pageIndex: number) => {
    if (!editor || editor.isDestroyed) return;
    const pagination = editor.view.dom.querySelector("[data-rm-pagination]");
    if (!pagination) return;
    const pageEl = pagination.children[pageIndex] as HTMLElement | undefined;
    pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!editor) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 text-[var(--text-muted)]">
        No editor
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <EditorRailSection title="Pages" count={pageCount}>
        <ul className="flex flex-col gap-2">
          {Array.from({ length: pageCount }, (_, i) => (
            <PageThumb
              key={i}
              editor={editor}
              pageIndex={i}
              active={i + 1 === currentPage}
              cache={thumbCacheRef.current}
              onCache={onCache}
              onSelect={() => scrollToPage(i)}
            />
          ))}
        </ul>
      </EditorRailSection>
    </div>
  );
}
