import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseDocumentStructure } from "./docx-ooxml";

const MINIMAL_STYLES = `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/><w:rFonts w:ascii="Calibri"/></w:rPr>
    <w:pPr><w:spacing w:line="276" w:lineRule="auto"/></w:pPr>
  </w:style>
</w:styles>`;

const MINIMAL_DOCUMENT = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Test</w:t></w:r></w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

async function buildMinimalDocx(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file("word/styles.xml", MINIMAL_STYLES);
  zip.file("word/document.xml", MINIMAL_DOCUMENT);
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("parseDocumentStructure", () => {
  it("parses default Normal style and Letter page setup", async () => {
    const buffer = await buildMinimalDocx();
    const structure = await parseDocumentStructure(buffer);

    expect(structure.defaultStyle.fontSizePt).toBe(11);
    expect(structure.defaultStyle.lineHeight).toBeCloseTo(1.15, 2);
    expect(structure.pageSetup.format).toBe("letter");
    expect(structure.mammothStyleMap.length).toBeGreaterThan(0);
  });
});
