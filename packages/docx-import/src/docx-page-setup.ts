import JSZip from "jszip";
import {
  DEFAULT_PAGE_SETUP,
  detectPageFormat,
  normalizePageSetup,
  type PageOrientation,
  type PageSetup,
} from "./page-setup.js";
import { twipsToPixels } from "./ooxml-units.js";

function parseOrientation(widthPx: number, heightPx: number): PageOrientation {
  return widthPx <= heightPx ? "portrait" : "landscape";
}

function parseSectPr(xml: string): PageSetup | null {
  const pgSzMatch = xml.match(/<w:pgSz[^>]*\bw:w="(\d+)"[^>]*\bw:h="(\d+)"/);
  if (!pgSzMatch) return null;

  const widthTwips = Number.parseInt(pgSzMatch[1], 10);
  const heightTwips = Number.parseInt(pgSzMatch[2], 10);
  const pageWidth = twipsToPixels(widthTwips);
  const pageHeight = twipsToPixels(heightTwips);

  const margins = { ...DEFAULT_PAGE_SETUP.margins };
  const mar = xml.match(/<w:pgMar[^>]*\/>/);
  if (mar) {
    const tag = mar[0];
    const read = (name: string, fallback: number) => {
      const m = tag.match(new RegExp(`\\bw:${name}="(\\d+)"`));
      return m ? twipsToPixels(Number.parseInt(m[1], 10)) : fallback;
    };
    margins.top = read("top", margins.top);
    margins.right = read("right", margins.right);
    margins.bottom = read("bottom", margins.bottom);
    margins.left = read("left", margins.left);
  }

  const format = detectPageFormat(pageWidth, pageHeight);
  const orientation = parseOrientation(pageWidth, pageHeight);

  return normalizePageSetup({ format, orientation, margins });
}

export async function extractPageSetupFromDocx(buffer: ArrayBuffer): Promise<PageSetup> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return DEFAULT_PAGE_SETUP;

  const sectBlocks = [...docXml.matchAll(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)];
  const lastSect = sectBlocks.length > 0 ? sectBlocks[sectBlocks.length - 1][0] : docXml;
  return parseSectPr(lastSect) ?? DEFAULT_PAGE_SETUP;
}
