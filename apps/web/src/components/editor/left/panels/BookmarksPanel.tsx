import { Star } from "lucide-react";
import { useState } from "react";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";
import { EditorRailSection } from "@/features/documents/components/editor/editor-rail-chrome";

export function BookmarksPanel() {
  const bookmarks = useEditorStore((s) => s.documentBookmarks);
  const addBookmark = useEditorStore((s) => s.addDocumentBookmark);
  const removeBookmark = useEditorStore((s) => s.removeDocumentBookmark);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
      <EditorRailSection title="Bookmarks">
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addBookmark(draft);
            setDraft("");
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add bookmark…"
            className="cs-kit-focus min-w-0 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-0)] px-2 py-1.5 text-[length:var(--text-sm-size)]"
          />
          <button
            type="submit"
            className="cs-kit-focus shrink-0 rounded-md bg-[var(--brand-500)] px-2 py-1.5 text-[length:var(--text-xs-size)] font-medium text-[var(--text-inverse)]"
          >
            Add
          </button>
        </form>
        {bookmarks.length === 0 ? (
          <p className="text-[length:var(--text-sm-size)] text-[var(--text-muted)]">
            No bookmarks yet. Name a section to jump back later.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {bookmarks.map((bm) => (
              <li
                key={bm.id}
                className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-0)] px-2 py-1.5"
              >
                <Star size={14} className="shrink-0 text-[var(--warning)]" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm-size)]">{bm.label}</span>
                <button
                  type="button"
                  className="cs-kit-focus text-[length:var(--text-xs-size)] text-[var(--text-muted)] hover:text-[var(--danger)]"
                  onClick={() => removeBookmark(bm.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </EditorRailSection>
    </div>
  );
}
