import { readDocxBuffer } from "./docx-fs.js";
import { importDocxToTipTap } from "./import-pipeline.js";
import type { DocxImportResult, ImportOptions } from "./docx-types.js";

export async function importDocxFileToTipTap(input: {
  docxPath: string;
  htmlFromLibreOffice: string;
  options?: ImportOptions;
  imageUrlByFilename?: Map<string, string>;
}): Promise<DocxImportResult> {
  const docxBuffer = await readDocxBuffer(input.docxPath);
  return importDocxToTipTap({
    docxBuffer,
    htmlFromLibreOffice: input.htmlFromLibreOffice,
    options: input.options,
    imageUrlByFilename: input.imageUrlByFilename,
  });
}
