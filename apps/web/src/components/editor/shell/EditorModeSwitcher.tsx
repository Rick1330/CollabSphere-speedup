import { useEffect, useState } from "react";
import { SegmentedControl } from "@/components/ui-kit";

export type EditorMode = "editing" | "suggesting" | "viewing";

const MODE_OPTIONS = [
  { value: "editing" as const, label: "Editing" },
  { value: "suggesting" as const, label: "Suggesting" },
  { value: "viewing" as const, label: "Viewing" },
];

export type EditorModeSwitcherProps = {
  isReadOnly?: boolean;
  className?: string;
};

export function EditorModeSwitcher({ isReadOnly = false, className }: EditorModeSwitcherProps) {
  const [mode, setMode] = useState<EditorMode>(isReadOnly ? "viewing" : "editing");

  useEffect(() => {
    setMode(isReadOnly ? "viewing" : "editing");
  }, [isReadOnly]);

  return (
    <SegmentedControl
      className={className}
      value={mode}
      onValueChange={(v) => {
        if (v === "suggesting") return;
        setMode(v as EditorMode);
      }}
      options={MODE_OPTIONS.map((o) => ({
        ...o,
        disabled: o.value === "suggesting",
      }))}
    />
  );
}
