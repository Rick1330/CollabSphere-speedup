import type { JSONContent } from "@tiptap/core";

function filenameMatchesSrc(filename: string, src: string): boolean {
  if (!src) return false;
  if (src.includes(filename)) return true;
  const base = filename.split(/[/\\]/).pop() ?? filename;
  if (src === base || src.endsWith(`/${base}`) || src.includes(base)) {
    return true;
  }
  try {
    const parsed = new URL(src, "http://local");
    const pathBase = parsed.pathname.split("/").pop() ?? "";
    return pathBase === base || pathBase === filename;
  } catch {
    return false;
  }
}

export function replaceImageSrcInContent(
  node: JSONContent,
  filename: string,
  url: string,
): JSONContent {
  if (node.type === "image") {
    const src = (node.attrs as { src?: string } | undefined)?.src ?? "";
    if (filenameMatchesSrc(filename, src)) {
      return { ...node, attrs: { ...node.attrs, src: url } };
    }
  }
  if (node.content) {
    return {
      ...node,
      content: node.content.map((child) => replaceImageSrcInContent(child, filename, url)),
    };
  }
  return node;
}

export function countDataUriImagesInContent(node: JSONContent): {
  imageCount: number;
  base64CharLength: number;
} {
  let imageCount = 0;
  let base64CharLength = 0;

  const walk = (current: JSONContent) => {
    if (current.type === "image") {
      const src = (current.attrs as { src?: string } | undefined)?.src ?? "";
      if (src.startsWith("data:")) {
        imageCount += 1;
        base64CharLength += src.length;
      }
    }
    current.content?.forEach(walk);
  };

  walk(node);
  return { imageCount, base64CharLength };
}
