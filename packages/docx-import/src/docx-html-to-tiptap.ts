import { generateJSON } from "@tiptap/html";
import type { JSONContent } from "@tiptap/core";
import type { LineHeightValue } from "./extensions/line-height.js";
import { getDocxImportExtensions } from "./docx-import-extensions.js";
import type { DocumentStructure } from "./docx-types.js";

const LINE_HEIGHT_VALUES = new Set<string>(["1", "1.15", "1.5", "2"]);

function normalizeLineHeight(value: number): LineHeightValue {
  const key = value.toFixed(2).replace(/\.?0+$/, "");
  if (LINE_HEIGHT_VALUES.has(key)) return key as LineHeightValue;
  if (value <= 1.08) return "1";
  if (value <= 1.3) return "1.15";
  if (value <= 1.75) return "1.5";
  return "2";
}

function injectPageBreaks(doc: JSONContent): JSONContent {
  const walk = (node: JSONContent): JSONContent => {
    if (node.type === "horizontalRule") {
      return { type: "pageBreakBlock" };
    }
    if (node.content) {
      return { ...node, content: node.content.map(walk) };
    }
    return node;
  };
  return walk(doc);
}

function applyStructureMarks(node: JSONContent, structure: DocumentStructure): JSONContent {
  if (node.type === "paragraph" || node.type === "heading") {
    const styleId =
      (node.attrs as { "data-word-style"?: string } | undefined)?.["data-word-style"];
    const style = (styleId && structure.styles.get(styleId)) || structure.defaultStyle;

    const lineHeight = normalizeLineHeight(style.lineHeight);
    const fontSize = `${style.fontSizePt}pt`;

    const content = node.content?.map((child) => {
      if (child.type !== "text") return child;
      const marks = [...(child.marks ?? [])];
      const hasFontSize = marks.some((m) => m.type === "textStyle" && m.attrs?.fontSize);
      if (!hasFontSize) {
        marks.push({ type: "textStyle", attrs: { fontSize } });
      }
      if (style.bold && !marks.some((m) => m.type === "bold")) {
        marks.push({ type: "bold" });
      }
      if (style.italic && !marks.some((m) => m.type === "italic")) {
        marks.push({ type: "italic" });
      }
      return { ...child, marks: marks.length > 0 ? marks : undefined };
    });

    return {
      ...node,
      attrs: {
        ...node.attrs,
        lineHeight,
      },
      content,
    };
  }

  if (node.content) {
    return { ...node, content: node.content.map((c) => applyStructureMarks(c, structure)) };
  }
  return node;
}

export function htmlToTipTapWithCorrections(
  html: string,
  structure: DocumentStructure,
): JSONContent {
  const wrapped = `<div>${html}</div>`;
  let json = generateJSON(wrapped, getDocxImportExtensions()) as JSONContent;
  json = injectPageBreaks(json);
  if (json.content) {
    json = {
      ...json,
      content: json.content.map((n) => applyStructureMarks(n, structure)),
    };
  }
  return json;
}
