import { Injectable } from "@nestjs/common";
import { parseDocumentStructure, type DocumentStructure } from "@collabsphere/docx-import";
import { extractImagesFromDocx, readDocxBuffer } from "@collabsphere/docx-import/server";

@Injectable()
export class DocxParserService {
  async parseFromPath(docxPath: string): Promise<DocumentStructure> {
    const buffer = await readDocxBuffer(docxPath);
    return parseDocumentStructure(buffer);
  }

  async readBuffer(docxPath: string): Promise<ArrayBuffer> {
    return readDocxBuffer(docxPath);
  }

  async extractImages(docxBuffer: ArrayBuffer): Promise<Map<string, Buffer>> {
    return extractImagesFromDocx(docxBuffer);
  }
}
