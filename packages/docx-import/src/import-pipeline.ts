import type { JSONContent } from "@tiptap/core";
import { extractDataUriImagesFromHtml } from "./data-uri-images.js";
import { postProcessImportHtml } from "./docx-html-postprocess.js";
import { htmlToTipTapWithCorrections } from "./docx-html-to-tiptap.js";
import { parseDocumentStructure } from "./docx-ooxml.js";
import { replaceImageSrcInContent } from "./image-urls.js";
import { buildImportMetadata } from "./metadata.js";
import type { DocxImportResult, ImportOptions } from "./docx-types.js";

export async function importDocxToTipTap(input: {
  docxBuffer: ArrayBuffer;
  htmlFromLibreOffice: string;
  options?: ImportOptions;
  imageUrlByFilename?: Map<string, string>;
}): Promise<DocxImportResult> {
  const structure = await parseDocumentStructure(input.docxBuffer);
  const { html: htmlWithoutDataUris } = extractDataUriImagesFromHtml(input.htmlFromLibreOffice);
  const html = postProcessImportHtml(htmlWithoutDataUris, structure);
  let content = htmlToTipTapWithCorrections(html, structure);

  if (input.imageUrlByFilename?.size) {
    for (const [filename, url] of input.imageUrlByFilename) {
      content = replaceImageSrcInContent(content, filename, url);
    }
  }

  const warnings = [...structure.warnings];
  if (!content.content?.length) {
    warnings.push({
      type: "warning",
      message: "Document body was empty after conversion.",
    });
  }

  const metadata = buildImportMetadata(content);

  return {
    content,
    pageSetup: structure.pageSetup,
    warnings,
    metadata,
  };
}

export function stripHtmlBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch?.[1]?.trim() ?? html;
}
