/** Inline `data:image/...;base64,...` sources from LibreOffice HTML → extractable buffers. */
export function extractDataUriImagesFromHtml(html: string): {
  html: string;
  images: Map<string, Buffer>;
} {
  const images = new Map<string, Buffer>();
  let index = 0;

  const rewritten = html.replace(
    /src=(["'])data:image\/([\w+.-]+);base64,([^"']+)\1/gi,
    (_match, _quote: string, mimeSub: string, b64: string) => {
      const ext = mimeSubToExtension(mimeSub);
      const filename = `inline-${index}.${ext}`;
      images.set(filename, Buffer.from(b64, "base64"));
      index += 1;
      return `src="${filename}"`;
    },
  );

  return { html: rewritten, images };
}

function mimeSubToExtension(mimeSub: string): string {
  const normalized = mimeSub.toLowerCase();
  if (normalized === "jpeg") return "jpg";
  if (normalized === "svg+xml") return "svg";
  return normalized.replace(/[^a-z0-9]/g, "") || "bin";
}
