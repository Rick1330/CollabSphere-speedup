import { Injectable } from "@nestjs/common";
import {
  importDocxToTipTap,
  stripHtmlBody,
  type DocxImportResult,
  type ImportOptions,
} from "@collabsphere/docx-import";

@Injectable()
export class TipTapTransformerService {
  async transform(input: {
    docxBuffer: ArrayBuffer;
    htmlFromLibreOffice: string;
    options?: ImportOptions;
    imageUrlByFilename?: Map<string, string>;
  }): Promise<DocxImportResult> {
    const bodyHtml = stripHtmlBody(input.htmlFromLibreOffice);
    return importDocxToTipTap({
      docxBuffer: input.docxBuffer,
      htmlFromLibreOffice: bodyHtml,
      options: input.options,
      imageUrlByFilename: input.imageUrlByFilename,
    });
  }
}
