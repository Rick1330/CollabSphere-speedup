import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  cn,
} from "@/components/ui-kit";
import { FontSizeControl } from "../controls/FontSizeControl";
import {
  DOC_FONT_FAMILIES,
  getActiveFontFamilyId,
  getFontSizePt,
  setFontFamilyChoice,
  setFontSizePt,
  type ToolbarEditorProps,
} from "../toolbar-utils";

export function FontGroup({ editor, isReadOnly }: ToolbarEditorProps) {
  const [size, setSize] = useState(11);

  const syncFromEditor = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    setSize(getFontSizePt(editor));
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    syncFromEditor();
    editor.on("selectionUpdate", syncFromEditor);
    editor.on("transaction", syncFromEditor);
    return () => {
      editor.off("selectionUpdate", syncFromEditor);
      editor.off("transaction", syncFromEditor);
    };
  }, [editor, syncFromEditor]);

  if (!editor) return null;

  const activeFamilyId = getActiveFontFamilyId(editor);
  const activeFamily = DOC_FONT_FAMILIES.find((f) => f.id === activeFamilyId) ?? DOC_FONT_FAMILIES[0];

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            disabled={isReadOnly}
            className="cs-kit-font-family-trigger cs-kit-focus"
            aria-label="Font family"
            style={{ fontFamily: activeFamily.value ?? "var(--font-doc)" }}
          >
            <span className="cs-kit-font-family-trigger__label">{activeFamily.label}</span>
            <ChevronDown size={12} strokeWidth={1.75} className="opacity-60" aria-hidden />
          </button>
        </MenuTrigger>
        <MenuContent align="start" className="min-w-[12rem]">
          {DOC_FONT_FAMILIES.map((family) => (
            <MenuItem
              key={family.id}
              disabled={isReadOnly}
              className={cn(activeFamilyId === family.id && "bg-[var(--brand-50)]")}
              onSelect={() => setFontFamilyChoice(editor, family.value)}
            >
              <span style={{ fontFamily: family.value ?? "var(--font-doc)" }}>{family.label}</span>
            </MenuItem>
          ))}
          <MenuItem
            disabled={isReadOnly}
            onSelect={() =>
              (editor.chain().focus() as { unsetFontSize?: () => { run: () => boolean } })
                .unsetFontSize?.()
                .run()
            }
          >
            Reset font size (11pt)
          </MenuItem>
        </MenuContent>
      </Menu>
      <FontSizeControl
        value={size}
        disabled={isReadOnly}
        onChange={(v) => {
          setSize(v);
          setFontSizePt(editor, v);
        }}
      />
    </>
  );
}
