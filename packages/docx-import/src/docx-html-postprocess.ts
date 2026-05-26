import { parseHTML } from "linkedom";
import {
  emusToPixels,
  LIKELY_EMU_THRESHOLD,
  LIKELY_TWIPS_THRESHOLD,
  twipsToPixels,
} from "./ooxml-units.js";
import type { DocumentStructure, WordParagraphStyle } from "./docx-types.js";

function resolveStyleForElement(
  el: Element,
  structure: DocumentStructure,
): WordParagraphStyle {
  const classList = Array.from(el.classList);
  for (const cls of classList) {
    if (cls.startsWith("word-")) {
      const id = cls.slice(5);
      const found = structure.styles.get(id);
      if (found) return found;
    }
  }
  const styleName = el.getAttribute("data-style-name");
  if (styleName) {
    for (const style of structure.styles.values()) {
      if (style.name === styleName) return style;
    }
  }
  return structure.defaultStyle;
}

function applyParagraphStyles(el: Element, style: WordParagraphStyle): void {
  el.setAttribute("data-word-style", style.id);
  el.setAttribute("data-font-size-pt", String(style.fontSizePt));
  el.setAttribute("data-line-height", String(style.lineHeight));
  const htmlEl = el as HTMLElement;
  htmlEl.style.fontSize = `${style.fontSizePt}pt`;
  htmlEl.style.lineHeight = String(style.lineHeight);
  htmlEl.style.fontFamily = `${style.fontFamily}, sans-serif`;
  if (style.spacingBeforePx > 0) {
    htmlEl.style.marginTop = `${style.spacingBeforePx}px`;
  }
  if (style.spacingAfterPx > 0) {
    htmlEl.style.marginBottom = `${style.spacingAfterPx}px`;
  } else {
    htmlEl.style.marginBottom = "0";
  }
}

function fixDimension(value: string | null, toPx: (n: number) => number): string | null {
  if (!value) return value;
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return value;
  if (n > LIKELY_TWIPS_THRESHOLD) {
    return `${Math.round(toPx(n))}px`;
  }
  return value;
}

function fixTableWidths(doc: Document): void {
  for (const table of doc.querySelectorAll("table")) {
    const widthAttr = table.getAttribute("width");
    if (widthAttr) {
      const n = Number.parseFloat(widthAttr);
      if (!Number.isNaN(n) && n > LIKELY_TWIPS_THRESHOLD) {
        table.style.width = `${Math.round(twipsToPixels(n))}px`;
        table.removeAttribute("width");
      }
    }
    const styleWidth = table.style.width;
    if (styleWidth) {
      const n = Number.parseFloat(styleWidth);
      if (!Number.isNaN(n) && n > LIKELY_TWIPS_THRESHOLD) {
        table.style.width = `${Math.round(twipsToPixels(n))}px`;
      }
    }
  }
}

function fixImages(doc: Document): void {
  for (const img of doc.querySelectorAll("img")) {
    for (const attr of ["width", "height"] as const) {
      const raw = img.getAttribute(attr);
      if (!raw) continue;
      const n = Number.parseFloat(raw);
      if (!Number.isNaN(n) && n > LIKELY_EMU_THRESHOLD) {
        const px = Math.round(emusToPixels(n));
        img.setAttribute(attr, String(px));
        img.style[attr] = `${px}px`;
      } else {
        const fixed = fixDimension(raw, twipsToPixels);
        if (fixed && fixed !== raw) {
          img.setAttribute(attr, fixed.replace("px", ""));
          img.style[attr] = fixed;
        }
      }
    }
  }
}

export function postProcessImportHtml(html: string, structure: DocumentStructure): string {
  const { document } = parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const body = document.body;

  const blockTags = ["P", "H1", "H2", "H3", "H4", "H5", "H6"];
  for (const el of body.querySelectorAll(blockTags.join(","))) {
    const style = resolveStyleForElement(el, structure);
    applyParagraphStyles(el, style);
  }

  for (const hr of body.querySelectorAll("hr")) {
    hr.setAttribute("data-page-break", "true");
  }

  fixTableWidths(document);
  fixImages(document);

  return body.innerHTML;
}
