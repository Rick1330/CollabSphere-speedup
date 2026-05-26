import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { detectPageFormat, twipsToPixels } from "@/components/editor/canvas/pageSetup";
import { extractPageSetupFromDocx } from "./docx-page-setup";

const LETTER_DOC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Hello</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const A4_DOC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

async function zipWithDocumentXml(xml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("docx page setup parsing", () => {
  it("converts twips to pixels", () => {
    expect(twipsToPixels(12240)).toBeCloseTo(816, 0);
  });

  it("detects letter from OOXML page size", async () => {
    const buffer = await zipWithDocumentXml(LETTER_DOC_XML);
    const setup = await extractPageSetupFromDocx(buffer);
    expect(setup.format).toBe("letter");
    expect(setup.orientation).toBe("portrait");
  });

  it("detects A4 from OOXML page size", async () => {
    const buffer = await zipWithDocumentXml(A4_DOC_XML);
    const setup = await extractPageSetupFromDocx(buffer);
    expect(setup.format).toBe("a4");
  });

  it("detectPageFormat matches parsed letter width", () => {
    expect(detectPageFormat(816, 1056)).toBe("letter");
  });
});
