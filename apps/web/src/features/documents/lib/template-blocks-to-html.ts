/**
 * Minimal ProseMirror-style block JSON → HTML for first-open template fallback.
 * Used when API persisted blocks but contentYjs is still empty (legacy rows).
 */

type TemplateBlock = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderInline = (content: unknown[] | undefined): string => {
  if (!content?.length) return "";
  return content
    .map((node) => {
      if (!isRecord(node)) return "";
      if (node.type === "text" && typeof node.text === "string") {
        return escapeHtml(node.text);
      }
      if (node.type === "hardBreak") return "<br />";
      if (Array.isArray(node.content)) {
        return renderInline(node.content);
      }
      return "";
    })
    .join("");
};

const renderBlock = (block: TemplateBlock): string => {
  const inner = renderInline(block.content);
  switch (block.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(block.attrs?.level ?? 1)));
      return `<h${level}>${inner || "&nbsp;"}</h${level}>`;
    }
    case "paragraph":
      return `<p>${inner || "&nbsp;"}</p>`;
    case "bulletList":
      return `<ul>${(block.content ?? [])
        .filter(isRecord)
        .map((item) =>
          item.type === "listItem"
            ? `<li>${(item.content ?? []).map((c) => (isRecord(c) ? renderBlock(c as TemplateBlock) : "")).join("")}</li>`
            : "",
        )
        .join("")}</ul>`;
    case "orderedList":
      return `<ol>${(block.content ?? [])
        .filter(isRecord)
        .map((item) =>
          item.type === "listItem"
            ? `<li>${(item.content ?? []).map((c) => (isRecord(c) ? renderBlock(c as TemplateBlock) : "")).join("")}</li>`
            : "",
        )
        .join("")}</ol>`;
    case "blockquote":
      return `<blockquote>${(block.content ?? [])
        .filter(isRecord)
        .map((c) => renderBlock(c as TemplateBlock))
        .join("")}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${inner}</code></pre>`;
    case "horizontalRule":
      return "<hr />";
    default:
      return inner ? `<p>${inner}</p>` : "";
  }
};

export const templateBlocksToHtml = (blocks: unknown): string => {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  return blocks
    .filter(isRecord)
    .map((entry) => renderBlock(entry as TemplateBlock))
    .filter(Boolean)
    .join("");
};

export const readTemplateBlocksFromProperties = (
  properties: unknown,
): TemplateBlock[] | null => {
  if (!isRecord(properties)) return null;
  const blocks = properties.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return blocks.filter(isRecord) as TemplateBlock[];
};
