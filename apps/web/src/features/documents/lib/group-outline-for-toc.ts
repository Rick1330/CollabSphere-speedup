import type { OutlineRailItem } from "@/features/documents/components/editor/editor-outline-rail";

export interface OutlineTocGroup {
  id: string;
  title: string;
  region?: OutlineRailItem;
  items: OutlineRailItem[];
}

/**
 * Groups flat outline entries into sidebar-14 TOC sections.
 * V2: region rows become group headers; following headings until next region are items.
 * Regular: H1 sections with nested headings; fallback single "Document" group.
 */
export function groupOutlineForToc(
  outline: OutlineRailItem[],
  isV2Template: boolean,
): OutlineTocGroup[] {
  if (outline.length === 0) return [];

  if (isV2Template) {
    const groups: OutlineTocGroup[] = [];
    let current: OutlineTocGroup | null = null;

    for (const node of outline) {
      if (node.regionIcon) {
        current = {
          id: node.id,
          title: node.text,
          region: node,
          items: [],
        };
        groups.push(current);
      } else if (current) {
        current.items.push(node);
      } else {
        groups.push({
          id: node.id,
          title: node.text,
          items: [node],
        });
      }
    }
    return groups;
  }

  const hasH1 = outline.some((n) => n.level === 1);
  if (!hasH1) {
    return [
      {
        id: "document-root",
        title: "Document",
        items: [...outline],
      },
    ];
  }

  const groups: OutlineTocGroup[] = [];
  let current: OutlineTocGroup | null = null;

  for (const node of outline) {
    if (node.level === 1) {
      current = {
        id: node.id,
        title: node.text || "(empty heading)",
        region: node,
        items: [],
      };
      groups.push(current);
    } else if (current) {
      current.items.push(node);
    } else {
      groups.push({
        id: node.id,
        title: node.text || "(empty heading)",
        items: [node],
      });
    }
  }

  return groups;
}

/** Flat list for search mode — every entry is a clickable sub-item. */
export function flattenOutlineForSearch(outline: OutlineRailItem[]): OutlineTocGroup[] {
  if (outline.length === 0) return [];
  return [
    {
      id: "search-results",
      title: "Results",
      items: outline,
    },
  ];
}
