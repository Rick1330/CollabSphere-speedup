import Table from "@tiptap/extension-table";

export const TableAdvanced = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      stripedRows: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-striped-rows") === "true",
        renderHTML: (attributes) =>
          attributes.stripedRows
            ? { "data-striped-rows": "true" }
            : {},
      },
      borderColor: {
        default: "#e5e7eb",
        parseHTML: (element) => element.getAttribute("data-border-color") ?? "#e5e7eb",
        renderHTML: (attributes) =>
          attributes.borderColor
            ? { "data-border-color": String(attributes.borderColor) }
            : {},
      },
      borderWidth: {
        default: 1,
        parseHTML: (element) => Number(element.getAttribute("data-border-width") ?? "1"),
        renderHTML: (attributes) =>
          attributes.borderWidth != null
            ? { "data-border-width": String(attributes.borderWidth) }
            : {},
      },
      borderStyle: {
        default: "solid",
        parseHTML: (element) => element.getAttribute("data-border-style") ?? "solid",
        renderHTML: (attributes) =>
          attributes.borderStyle
            ? { "data-border-style": String(attributes.borderStyle) }
            : {},
      },
      cellPadding: {
        default: 8,
        parseHTML: (element) => Number(element.getAttribute("data-cell-padding") ?? "8"),
        renderHTML: (attributes) =>
          attributes.cellPadding != null
            ? { "data-cell-padding": String(attributes.cellPadding) }
            : {},
      },
    };
  },
});
