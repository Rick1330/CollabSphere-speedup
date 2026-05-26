import { Extension } from "@tiptap/core";

const INDENT_STEP_EM = 1.5;
const MAX_INDENT_LEVEL = 8;

export type ParagraphIndentOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphIndent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

function parseIndentLevel(element: HTMLElement): number {
  const margin = element.style.marginLeft;
  if (!margin) return 0;
  const match = /^([\d.]+)em$/.exec(margin);
  if (!match) return 0;
  return Math.round(parseFloat(match[1]) / INDENT_STEP_EM);
}

export const ParagraphIndent = Extension.create<ParagraphIndentOptions>({
  name: "paragraphIndent",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => parseIndentLevel(element),
            renderHTML: (attributes) => {
              const level = Number(attributes.indent) || 0;
              if (level <= 0) return {};
              return { style: `margin-left: ${level * INDENT_STEP_EM}em` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const changeIndent =
      (delta: number) =>
      ({ editor, commands }: { editor: import("@tiptap/core").Editor; commands: import("@tiptap/core").RawCommands }) => {
        const type = editor.isActive("heading") ? "heading" : "paragraph";
        const current = Number(editor.getAttributes(type).indent) || 0;
        const next = Math.max(0, Math.min(MAX_INDENT_LEVEL, current + delta));
        return commands.updateAttributes(type, { indent: next });
      };

    return {
      increaseIndent: () => changeIndent(1),
      decreaseIndent: () => changeIndent(-1),
    };
  },
});
