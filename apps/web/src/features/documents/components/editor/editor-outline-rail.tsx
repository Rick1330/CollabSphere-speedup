/**
 * DocumentOutlineRail
 *
 * In-document table-of-contents derived from the live editor headings.
 * Click a heading → smooth-scroll the writing canvas to it. Indents by
 * heading level (h1..h6) using a 12px step.
 *
 * Empty state: explicit hint that headings haven't been added yet.
 */
import { ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OutlineNode } from "@/features/documents/hooks/use-document-outline";

interface DocumentOutlineRailProps {
  outline: OutlineNode[];
  activeId?: string | null;
  onJump: (node: OutlineNode) => void;
}

export const DocumentOutlineRail = ({
  outline,
  activeId,
  onJump,
}: DocumentOutlineRailProps) => {
  if (outline.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-stone-400 text-[13px]">
        <ScrollText
          className="h-5 w-5 mx-auto mb-2 opacity-40"
          aria-hidden="true"
        />
        <p className="font-medium text-stone-500 mb-1">No outline yet</p>
        <p className="leading-snug">
          Add a heading (H1, H2, H3…) to build a table of contents.
        </p>
      </div>
    );
  }

  return (
    <nav aria-label="Document outline" className="py-2">
      <ul className="text-[13px]">
        {outline.map((n) => {
          const isActive = activeId === n.id;
          const isEmpty = n.text === "";
          return (
            <li key={`${n.id}-${n.pos}`}>
              <button
                type="button"
                onClick={() => onJump(n)}
                className={cn(
                  "block w-full text-left px-3 py-1 rounded-md transition-colors duration-100",
                  "border-l-2 -ml-px",
                  isActive
                    ? "border-l-teal-500 bg-teal-50/60 text-teal-800 font-medium"
                    : "border-l-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                  isEmpty && "italic text-stone-400",
                )}
                style={{ paddingLeft: `${12 + (n.level - 1) * 12}px` }}
                title={n.text || "(empty heading)"}
              >
                <span className="line-clamp-1">{n.text || "(empty heading)"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
