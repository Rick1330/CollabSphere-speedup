import JSZip from "jszip";
import { DEFAULT_PAGE_SETUP } from "./page-setup.js";
import { extractPageSetupFromDocx } from "./docx-page-setup.js";
import { substituteFontFamily } from "./docx-font-substitution.js";
import { halfPointsToPoints, twipsToPixels } from "./ooxml-units.js";
import type { DocumentStructure, ImportWarning, WordParagraphStyle } from "./docx-types.js";

const DEFAULT_BODY: WordParagraphStyle = {
  id: "Normal",
  name: "Normal",
  fontSizePt: 11,
  lineHeight: 1.15,
  fontFamily: "Carlito",
  spacingBeforePx: 0,
  spacingAfterPx: 0,
};

function readAttr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\bw:${name}="([^"]+)"`));
  return m?.[1] ?? null;
}

function parseLineHeight(spacingTag: string | null, fontSizePt: number): number {
  if (!spacingTag) return 1.15;
  const lineRule = readAttr(spacingTag, "lineRule");
  const lineRaw = readAttr(spacingTag, "line");
  if (!lineRaw) return 1.15;
  const lineVal = Number.parseInt(lineRaw, 10);
  if (Number.isNaN(lineVal)) return 1.15;

  if (lineRule === "exact" || lineRule === "atLeast") {
    const linePt = lineVal / 20;
    return Math.max(1, linePt / fontSizePt);
  }
  return lineVal / 240;
}

function parseParagraphStyle(
  styleXml: string,
  styleId: string,
  fontTable: Map<string, string>,
  warnings: ImportWarning[],
): WordParagraphStyle {
  const nameMatch = styleXml.match(/<w:name[^>]*\bw:val="([^"]+)"/);
  const name = nameMatch?.[1] ?? styleId;

  const rPr = styleXml.match(/<w:rPr[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  const szRaw = readAttr(rPr, "sz");
  const fontSizePt = szRaw ? halfPointsToPoints(Number.parseInt(szRaw, 10)) : 11;

  const rFonts = rPr.match(/<w:rFonts[^>]*\/>/)?.[0] ?? "";
  const fontRef = readAttr(rFonts, "ascii") ?? readAttr(rFonts, "hAnsi") ?? "Calibri";
  const { family, substituted } = substituteFontFamily(fontTable.get(fontRef) ?? fontRef);
  if (substituted) {
    warnings.push({
      type: "info",
      message: `Font "${fontRef}" substituted with "${family}"`,
    });
  }

  const pPr = styleXml.match(/<w:pPr[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const spacingTag = pPr.match(/<w:spacing[^>]*\/>/)?.[0] ?? null;
  const lineHeight = parseLineHeight(spacingTag, fontSizePt);

  const spacingBeforePx = spacingTag
    ? twipsToPixels(Number.parseInt(readAttr(spacingTag, "before") ?? "0", 10))
    : 0;
  const spacingAfterPx = spacingTag
    ? twipsToPixels(Number.parseInt(readAttr(spacingTag, "after") ?? "0", 10))
    : 0;

  const bold = /<w:b\b/.test(rPr);
  const italic = /<w:i\b/.test(rPr);

  return {
    id: styleId,
    name,
    fontSizePt,
    lineHeight,
    fontFamily: family,
    spacingBeforePx,
    spacingAfterPx,
    bold,
    italic,
  };
}

function parseFontTable(xml: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!xml) return map;
  const fonts = [...xml.matchAll(/<w:font[^>]*\bw:name="([^"]+)"[^>]*>/g)];
  for (const m of fonts) {
    map.set(m[1], m[1]);
  }
  return map;
}

function parseStylesXml(
  stylesXml: string | null,
  fontTable: Map<string, string>,
  warnings: ImportWarning[],
): Map<string, WordParagraphStyle> {
  const styles = new Map<string, WordParagraphStyle>();
  if (!stylesXml) return styles;

  const blocks = [...stylesXml.matchAll(/<w:style[^>]*\bw:styleId="([^"]+)"[\s\S]*?<\/w:style>/g)];
  for (const block of blocks) {
    const styleId = block[1];
    const full = block[0];
    if (!/\bw:type="paragraph"/.test(full) && !/\bw:default="1"/.test(full)) {
      continue;
    }
    styles.set(styleId, parseParagraphStyle(full, styleId, fontTable, warnings));
  }
  return styles;
}

function resolveDefaultStyle(styles: Map<string, WordParagraphStyle>): WordParagraphStyle {
  for (const style of styles.values()) {
    if (style.name === "Normal" || style.id === "Normal") return style;
  }
  const first = styles.values().next().value;
  return first ?? DEFAULT_BODY;
}

function buildMammothStyleMap(styles: Map<string, WordParagraphStyle>): string[] {
  const lines: string[] = [];
  for (const style of styles.values()) {
    if (/^heading\s*\d$/i.test(style.name) || /^Heading\s*\d$/.test(style.name)) {
      const level = style.name.match(/\d/)?.[0] ?? "1";
      lines.push(`p[style-name='${style.name}'] => h${level}.word-${style.id}:fresh`);
    } else {
      lines.push(`p[style-name='${style.name}'] => p.word-${style.id}:fresh`);
    }
  }
  lines.push(
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Title'] => h1:fresh",
  );
  return lines;
}

export async function parseDocumentStructure(buffer: ArrayBuffer): Promise<DocumentStructure> {
  const warnings: ImportWarning[] = [];
  const pageSetup = await extractPageSetupFromDocx(buffer);

  const zip = await JSZip.loadAsync(buffer);
  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  const fontTableXml = await zip.file("word/fontTable.xml")?.async("string");
  const fontTable = parseFontTable(fontTableXml ?? null);
  const styles = parseStylesXml(stylesXml ?? null, fontTable, warnings);
  const defaultStyle = resolveDefaultStyle(styles);

  if (styles.size === 0) {
    warnings.push({
      type: "info",
      message: "No paragraph styles found in DOCX; using Word defaults (11pt, 1.15 line height)",
    });
  }

  return {
    pageSetup: pageSetup ?? DEFAULT_PAGE_SETUP,
    styles,
    defaultStyle,
    warnings,
    mammothStyleMap: buildMammothStyleMap(styles),
  };
}

export async function extractImagesFromDocx(
  buffer: ArrayBuffer,
): Promise<Map<string, Buffer>> {
  const images = new Map<string, Buffer>();
  const zip = await JSZip.loadAsync(buffer);
  const media = zip.folder("word/media");
  if (!media) return images;

  for (const [relativePath, file] of Object.entries(media.files)) {
    if (file.dir) continue;
    const name = relativePath.split("/").pop() ?? relativePath;
    try {
      const data = await file.async("nodebuffer");
      images.set(name, data);
    } catch {
      /* skip broken media */
    }
  }
  return images;
}
