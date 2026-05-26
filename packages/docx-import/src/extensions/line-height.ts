import { Extension } from "@tiptap/core";

export const LINE_HEIGHT_OPTIONS = ["1", "1.15", "1.5", "2"] as const;
export type LineHeightValue = (typeof LINE_HEIGHT_OPTIONS)[number];

export type LineHeightOptions = {
  types: string[];
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: LineHeightValue) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: "lineHeight",

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
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const blockType = (editor: import("@tiptap/core").Editor) =>
      editor.isActive("heading") ? "heading" : "paragraph";

    return {
      setLineHeight:
        (lineHeight) =>
        ({ editor, commands }) =>
          commands.updateAttributes(blockType(editor), { lineHeight }),
      unsetLineHeight:
        () =>
        ({ editor, commands }) =>
          commands.resetAttributes(blockType(editor), "lineHeight"),
    };
  },
});
