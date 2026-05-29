import * as Y from "yjs";

export type ExportBlock =
  | { kind: "html"; html: string; estimatedHeightPx: number }
  | { kind: "pageBreak" };

const LINE_HEIGHT_PX = 22;
const PARAGRAPH_MARGIN_PX = 12;
const HEADING_HEIGHT: Record<number, number> = {
  1: 48,
  2: 40,
  3: 32,
  4: 28,
  5: 26,
  6: 24,
};
const TABLE_ROW_HEIGHT = 28;
const DEFAULT_BLOCK_HEIGHT = 24;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function estimateParagraphHeight(text: string): number {
  const lines = Math.max(1, Math.ceil(text.length / 80));
  return lines * LINE_HEIGHT_PX + PARAGRAPH_MARGIN_PX;
}

function estimateHeadingHeight(level: number, text: string): number {
  const base = HEADING_HEIGHT[level] ?? 28;
  const extra = Math.max(0, Math.ceil(text.length / 60) - 1) * LINE_HEIGHT_PX;
  return base + extra;
}

function walkXmlToBlocks(
  node: Y.XmlFragment | Y.AbstractType<unknown> | Y.XmlText,
  blocks: ExportBlock[],
): void {
  if (node instanceof Y.XmlText) {
    return;
  }

  if (node instanceof Y.XmlElement) {
    const name = node.nodeName;
    if (name === "heading") {
      const level = Math.min(6, Math.max(1, Number(node.getAttribute("level") ?? 1)));
      const inner: string[] = [];
      node.toArray().forEach((child) => {
        if (child instanceof Y.XmlText) {
          const text = child.toString();
          if (text) inner.push(escapeHtml(text));
        }
      });
      const text = inner.join("");
      blocks.push({
        kind: "html",
        html: `<h${level}>${text}</h${level}>`,
        estimatedHeightPx: estimateHeadingHeight(level, text),
      });
      return;
    }
    if (name === "paragraph") {
      const inner: string[] = [];
      node.toArray().forEach((child) => {
        if (child instanceof Y.XmlText) {
          const text = child.toString();
          if (text) inner.push(escapeHtml(text));
        }
      });
      const content = inner.join("");
      blocks.push({
        kind: "html",
        html: content ? `<p>${content}</p>` : "<p></p>",
        estimatedHeightPx: estimateParagraphHeight(content),
      });
      return;
    }
    if (name === "bulletList" || name === "orderedList") {
      const tag = name === "orderedList" ? "ol" : "ul";
      const items: string[] = [];
      let itemCount = 0;
      node.toArray().forEach((child) => {
        if (child instanceof Y.XmlElement && child.nodeName === "listItem") {
          itemCount += 1;
          const inner: string[] = [];
          child.toArray().forEach((liChild) => {
            if (liChild instanceof Y.XmlText) {
              const text = liChild.toString();
              if (text) inner.push(escapeHtml(text));
            }
          });
          items.push(`<li>${inner.join("")}</li>`);
        }
      });
      blocks.push({
        kind: "html",
        html: `<${tag}>${items.join("")}</${tag}>`,
        estimatedHeightPx: itemCount * LINE_HEIGHT_PX + PARAGRAPH_MARGIN_PX,
      });
      return;
    }
    if (name === "table") {
      const rows: string[] = [];
      let rowCount = 0;
      node.toArray().forEach((row) => {
        if (!(row instanceof Y.XmlElement) || row.nodeName !== "tableRow") return;
        rowCount += 1;
        const cells: string[] = [];
        row.toArray().forEach((cell) => {
          if (!(cell instanceof Y.XmlElement)) return;
          const cellTag =
            cell.nodeName === "tableHeader" ? "th" : cell.nodeName === "tableCell" ? "td" : null;
          if (!cellTag) return;
          const inner: string[] = [];
          cell.toArray().forEach((cellChild) => {
            if (cellChild instanceof Y.XmlText) {
              const text = cellChild.toString();
              if (text) inner.push(escapeHtml(text));
            }
          });
          cells.push(`<${cellTag}>${inner.join("")}</${cellTag}>`);
        });
        rows.push(`<tr>${cells.join("")}</tr>`);
      });
      blocks.push({
        kind: "html",
        html: `<table>${rows.join("")}</table>`,
        estimatedHeightPx: Math.max(rowCount, 1) * TABLE_ROW_HEIGHT + PARAGRAPH_MARGIN_PX,
      });
      return;
    }
    if (
      name === "pageBreak" ||
      name === "page-break" ||
      name === "pageBreakBlock" ||
      name === "page-break-block"
    ) {
      blocks.push({ kind: "pageBreak" });
      return;
    }
    node.toArray().forEach((child) => {
      walkXmlToBlocks(child as Y.AbstractType<unknown> | Y.XmlText, blocks);
    });
    return;
  }

  if (node instanceof Y.XmlFragment) {
    node.toArray().forEach((child) => {
      walkXmlToBlocks(child as Y.AbstractType<unknown> | Y.XmlText, blocks);
    });
  }
}

const COLLAB_FRAGMENT_NAMES = ["prosemirror", "default"] as const;

export function yjsStateToExportBlocks(yjsState: Uint8Array): ExportBlock[] {
  const ydoc = new Y.Doc();
  if (yjsState.byteLength > 0) {
    Y.applyUpdate(ydoc, yjsState);
  }

  const blocks: ExportBlock[] = [];
  for (const name of COLLAB_FRAGMENT_NAMES) {
    const fragment = ydoc.getXmlFragment(name);
    if (fragment.length > 0) {
      walkXmlToBlocks(fragment, blocks);
      break;
    }
  }
  return blocks;
}

export function plaintextToExportBlocks(plaintext: string): ExportBlock[] {
  return plaintext
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const html = `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`;
      return {
        kind: "html" as const,
        html,
        estimatedHeightPx: estimateParagraphHeight(block),
      };
    });
}
