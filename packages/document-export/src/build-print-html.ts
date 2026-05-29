import type { PageSetup } from "./page-setup.js";
import { DEFAULT_PAGE_SETUP, pageSetupToPrintOptions } from "./page-setup.js";

export type DocumentPrintInput = {
  title: string;
  bodyHtml: string;
  pageSetup?: PageSetup;
  pageSize?: "A4" | "letter" | "legal" | "Letter" | "Legal";
  orientation?: "portrait" | "landscape";
  marginMm?: { top: number; right: number; bottom: number; left: number };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap document body HTML in a print-oriented page template for Playwright PDF. */
export function buildDocumentPrintHtml(input: DocumentPrintInput): string {
  const title = escapeHtml(input.title || "Document");
  const setup = input.pageSetup ?? DEFAULT_PAGE_SETUP;
  const derived = pageSetupToPrintOptions(setup);
  const pageSize = input.pageSize ?? derived.pageSize;
  const orientation = input.orientation ?? derived.orientation;
  const margin = input.marginMm ?? derived.marginMm;
  const { pageWidth, pageHeight } = derived.contentBox;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: ${margin.top}mm ${margin.right}mm ${margin.bottom}mm ${margin.left}mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Source Serif 4", Georgia, "Times New Roman", serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111827;
      margin: 0;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: Inter, system-ui, sans-serif;
      color: #111827;
      margin: 1.2em 0 0.4em;
      page-break-after: avoid;
    }
    h1 { font-size: 22pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 13pt; }
    p { margin: 0 0 0.75em; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.75em 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 6px 8px;
      vertical-align: top;
    }
    th { background: #f3f4f6; font-weight: 600; }
    img { max-width: 100%; height: auto; }
    .page-break { break-after: page; page-break-after: always; height: 0; }
  .cs-export-page {
      width: ${pageWidth}px;
      min-height: ${pageHeight}px;
      margin: 0 auto;
      padding: 0;
      break-after: page;
      page-break-after: always;
      overflow: visible;
    }
    .cs-export-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    pre, code { font-family: ui-monospace, monospace; font-size: 10pt; }
  </style>
</head>
<body>
  <article class="cs-export-document">
    ${input.bodyHtml}
  </article>
</body>
</html>`;
}
