import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Collaboration from "@tiptap/extension-collaboration";
import Gapcursor from "@tiptap/extension-gapcursor";
import type { Extensions } from "@tiptap/core";
import type * as Y from "yjs";
import { MermaidBlock } from "@/features/documents/editor-extensions/mermaid-block";
import { MathBlock } from "@/features/documents/editor-extensions/math-block";
import { CalloutBlock } from "@/features/documents/editor-extensions/callout-block";
import { SectionBlock } from "@/features/documents/editor-extensions/section-block";
import { TOCBlock } from "@/features/documents/editor-extensions/toc-block";
import { CoverPageBlock } from "@/features/documents/editor-extensions/cover-page-block";
import { PageBreakBlock } from "@/features/documents/editor-extensions/page-break-block";

export const VERSION_PREVIEW_PROSE_CLASS = [
  "version-preview",
  "prose prose-stone max-w-none",
  "prose-headings:font-semibold prose-headings:text-stone-900",
  "prose-p:text-stone-700 prose-p:leading-relaxed",
  "prose-a:text-teal-600",
  "focus:outline-none min-h-[40vh]",
].join(" ");

export function buildVersionPreviewExtensions(ydoc: Y.Doc): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      history: false,
      gapcursor: false,
      codeBlock: {
        HTMLAttributes: {
          class:
            "not-prose rounded-lg bg-stone-900 text-stone-100 p-4 text-sm font-mono overflow-x-auto",
        },
      },
    }),
    Gapcursor,
    Collaboration.configure({ document: ydoc }),
    Underline,
    TextStyle,
    Color.configure({ types: ["textStyle"] }),
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: "text-teal-600 pointer-events-none" },
    }),
    Table.configure({
      resizable: false,
      HTMLAttributes: { class: "w-full border-collapse my-4 text-sm" },
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: {
        class: "bg-stone-100 text-left font-semibold px-3 py-2 border border-stone-200",
      },
    }),
    TableCell.configure({
      HTMLAttributes: { class: "px-3 py-2 border border-stone-200 align-top" },
    }),
    MermaidBlock,
    MathBlock,
    CalloutBlock,
    SectionBlock,
    TOCBlock,
    CoverPageBlock,
    PageBreakBlock,
  ] as Extensions;
}
