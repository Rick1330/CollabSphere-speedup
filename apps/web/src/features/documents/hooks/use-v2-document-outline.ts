import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { OutlineNode } from "@/features/documents/hooks/use-document-outline";

export type OutlineBadge = "lock" | "warning" | "gear";

export type V2RegionIcon =
  | "file-text"
  | "list-tree"
  | "layout-list"
  | "scissors"
  | "message-square";

export interface V2OutlineEntry extends OutlineNode {
  regionIcon?: V2RegionIcon;
  badges?: OutlineBadge[];
}

const REGION_TYPES = new Set([
  "coverPageBlock",
  "tocBlock",
  "sectionBlock",
  "pageBreakBlock",
  "calloutBlock",
]);

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isSectionEmpty(node: {
  descendants: (
    f: (n: {
      isText: boolean;
      text: string;
      type: { name: string };
      textContent: string;
    }) => boolean | void,
  ) => void;
}): boolean {
  let hasContent = false;
  node.descendants((child) => {
    if (child.type.name === "heading" && child.textContent.trim()) {
      hasContent = true;
      return false;
    }
    if (child.isText && child.text.trim().length > 0) {
      hasContent = true;
      return false;
    }
    return undefined;
  });
  return !hasContent;
}

function regionMeta(
  type: string,
  attrs: Record<string, unknown>,
): { regionIcon: V2RegionIcon; title: string } {
  switch (type) {
    case "coverPageBlock":
      return { regionIcon: "file-text", title: "Cover Page" };
    case "tocBlock":
      return { regionIcon: "list-tree", title: "Table of Contents" };
    case "sectionBlock":
      return { regionIcon: "layout-list", title: String(attrs.title ?? "Section") };
    case "pageBreakBlock":
      return { regionIcon: "scissors", title: "Page Break" };
    case "calloutBlock":
      return {
        regionIcon: "message-square",
        title: `${capitalize(String(attrs.type ?? "info"))} callout`,
      };
    default:
      return { regionIcon: "layout-list", title: type };
  }
}

function regionBadges(
  type: string,
  attrs: Record<string, unknown>,
  node: {
    descendants: (
      f: (n: {
        isText: boolean;
        text: string;
        type: { name: string };
        textContent: string;
      }) => boolean | void,
    ) => void;
  },
): OutlineBadge[] {
  const badges: OutlineBadge[] = [];
  if (attrs.locked === true || type === "tocBlock") {
    badges.push("lock");
  }
  if (type === "tocBlock") {
    badges.push("gear");
  }
  if (type === "sectionBlock" && attrs.required === true && isSectionEmpty(node)) {
    badges.push("warning");
  }
  return badges;
}

export function collectV2Outline(editor: Editor): V2OutlineEntry[] {
  const out: V2OutlineEntry[] = [];
  const doc = editor.state.doc;

  doc.forEach((node, offset) => {
    if (!REGION_TYPES.has(node.type.name)) return;
    const pos = offset;
    const attrs = node.attrs as Record<string, unknown>;
    const { regionIcon, title } = regionMeta(node.type.name, attrs);
    const badges = regionBadges(node.type.name, attrs, node);

    out.push({
      id: `region-${pos}`,
      level: 1,
      text: title,
      pos,
      regionIcon,
      badges: badges.length > 0 ? badges : undefined,
    });

    if (node.type.name === "sectionBlock") {
      const sectionEnd = pos + node.nodeSize;
      editor.state.doc.nodesBetween(pos + 1, sectionEnd - 1, (child, childPos) => {
        if (child.type.name !== "heading") return undefined;
        const text = child.textContent.trim();
        out.push({
          id: `heading-${childPos}`,
          level: 1 + (child.attrs.level as number),
          text: text || "(empty heading)",
          pos: childPos,
        });
        return false;
      });
    }
  });

  return out;
}

export function useV2DocumentOutline(editor: Editor | null): V2OutlineEntry[] {
  const [outline, setOutline] = useState<V2OutlineEntry[]>([]);

  useEffect(() => {
    if (!editor) {
      setOutline([]);
      return;
    }
    let frame = 0;
    const recompute = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!editor.isDestroyed) {
          setOutline(collectV2Outline(editor));
        }
      });
    };
    recompute();
    editor.on("update", recompute);
    editor.on("transaction", recompute);
    return () => {
      cancelAnimationFrame(frame);
      editor.off("update", recompute);
      editor.off("transaction", recompute);
    };
  }, [editor]);

  return outline;
}
