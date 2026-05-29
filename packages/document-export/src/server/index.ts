import type { ExportPageSetup } from "@collabsphere/shared/jobs";
import { buildDocumentPrintHtml } from "../build-print-html.js";
import { plaintextToExportBlocks, yjsStateToExportBlocks } from "../export-blocks.js";
import { paginateExportBlocks, pagesToBodyHtml } from "../paginate-blocks.js";
import {
  DEFAULT_PAGE_SETUP,
  type PageSetup,
  pageSetupToPrintOptions,
} from "../page-setup.js";

export { pageSetupToPrintOptions, pixelsToMm } from "../page-setup.js";
export { paginateExportBlocks, pagesToBodyHtml } from "../paginate-blocks.js";
export { yjsStateToExportBlocks, plaintextToExportBlocks } from "../export-blocks.js";

export function normalizeExportPageSetup(setup?: ExportPageSetup): PageSetup {
  if (!setup) return DEFAULT_PAGE_SETUP;
  return {
    format: setup.format,
    orientation: setup.orientation,
    margins: { ...setup.margins },
  };
}

export function yjsStateToExportHtml(
  yjsState: Uint8Array,
  title: string,
  pageSetup?: ExportPageSetup,
): string {
  const setup = normalizeExportPageSetup(pageSetup);
  const blocks = yjsStateToExportBlocks(yjsState);
  const pages = paginateExportBlocks(blocks, setup);
  const bodyHtml = pagesToBodyHtml(pages, setup);
  const printOpts = pageSetupToPrintOptions(setup);
  return buildDocumentPrintHtml({
    title,
    bodyHtml,
    pageSetup: setup,
    pageSize: printOpts.pageSize,
    orientation: printOpts.orientation,
    marginMm: printOpts.marginMm,
  });
}

export function plaintextToExportHtml(
  plaintext: string,
  title: string,
  pageSetup?: ExportPageSetup,
): string {
  const setup = normalizeExportPageSetup(pageSetup);
  const blocks = plaintextToExportBlocks(plaintext);
  const pages = paginateExportBlocks(blocks, setup);
  const bodyHtml = pagesToBodyHtml(pages, setup);
  const printOpts = pageSetupToPrintOptions(setup);
  return buildDocumentPrintHtml({
    title,
    bodyHtml,
    pageSetup: setup,
    pageSize: printOpts.pageSize,
    orientation: printOpts.orientation,
    marginMm: printOpts.marginMm,
  });
}
