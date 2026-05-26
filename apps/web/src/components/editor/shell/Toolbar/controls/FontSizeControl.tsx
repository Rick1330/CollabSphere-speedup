import { Minus, Plus } from "lucide-react";
import { cn } from "@/components/ui-kit";
import { FONT_SIZE_MAX_PT, FONT_SIZE_MIN_PT } from "../toolbar-utils";

export type FontSizeControlProps = {
  value: number;
  onChange: (pt: number) => void;
  disabled?: boolean;
  className?: string;
};

export function FontSizeControl({ value, onChange, disabled, className }: FontSizeControlProps) {
  const step = (delta: number) => {
    onChange(Math.max(FONT_SIZE_MIN_PT, Math.min(FONT_SIZE_MAX_PT, value + delta)));
  };

  const commitInput = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n)) onChange(n);
  };

  return (
    <div
      className={cn("cs-kit-font-size-control", className)}
      role="group"
      aria-label="Font size"
    >
      <button
        type="button"
        className="cs-kit-font-size-control__btn cs-kit-focus"
        disabled={disabled || value <= FONT_SIZE_MIN_PT}
        aria-label="Decrease font size"
        onClick={() => step(-1)}
      >
        <Minus size={14} strokeWidth={1.75} aria-hidden />
      </button>
      <input
        type="text"
        inputMode="numeric"
        className="cs-kit-font-size-control__input cs-kit-focus"
        value={value}
        disabled={disabled}
        aria-label="Font size in points"
        onChange={(e) => commitInput(e.target.value)}
        onBlur={(e) => commitInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      <button
        type="button"
        className="cs-kit-font-size-control__btn cs-kit-focus"
        disabled={disabled || value >= FONT_SIZE_MAX_PT}
        aria-label="Increase font size"
        onClick={() => step(1)}
      >
        <Plus size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
