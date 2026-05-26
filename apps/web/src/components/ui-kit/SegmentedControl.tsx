import type { ReactNode } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { cn } from "./cn";

export type SegmentedOption = { value: string; label: ReactNode };

export type SegmentedControlProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SegmentedOption[];
  disabled?: boolean;
  className?: string;
};

export function SegmentedControl({
  value,
  onValueChange,
  options,
  disabled,
  className,
}: SegmentedControlProps) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v)}
      disabled={disabled}
      className={cn("cs-kit-segmented", className)}
      aria-label="Segmented control"
    >
      {options.map((opt) => (
        <ToggleGroup.Item
          key={opt.value}
          value={opt.value}
          className="cs-kit-segmented-item cs-kit-focus"
        >
          {opt.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
