import { useCallback, useEffect, useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Pipette } from "lucide-react";
import { cn } from "./cn";
import { Input } from "./Field";

/** Brand row (5) — fixed hex approximations of editor tokens */
export const BRAND_SWATCHES = [
  "#14B8A6",
  "#0D9488",
  "#0F766E",
  "#115E59",
  "#134E4A",
] as const;

/** Standard row (10) — legacy palette + neutrals */
export const STANDARD_SWATCHES = [
  "#111827",
  "#6B7280",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#FFFFFF",
] as const;

const EXPANDED_SWATCHES = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#B7B7B7",
  "#CCCCCC",
  "#D9D9D9",
  "#EFEFEF",
  "#F3F3F3",
  "#FFFFFF",
  "#980000",
  "#FF0000",
  "#FF9900",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#4A86E8",
  "#0000FF",
  "#9900FF",
  "#FF00FF",
] as const;

const HEX_RE = /^#([0-9A-Fa-f]{6})$/;

export function normalizeHex(color: string): string | null {
  const trimmed = color.trim();
  if (!trimmed.startsWith("#")) return null;
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (!HEX_RE.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const n = parseInt(normalized.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export type ColorPickerProps = {
  value?: string;
  onChange: (color: string) => void;
  onClear?: () => void;
  recentColors?: string[];
  onRecentAdd?: (hex: string) => void;
  allowEyedropper?: boolean;
  defaultExpanded?: boolean;
  className?: string;
};

function SwatchGrid({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: readonly string[];
  value?: string;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="cs-kit-color-section">
      <span className="cs-kit-color-section-label">{label}</span>
      <div className="cs-kit-color-swatches" role="listbox" aria-label={`${label} colors`}>
        {colors.map((color) => {
          const normalized = normalizeHex(color) ?? color;
          const selected = value?.toUpperCase() === normalized.toUpperCase();
          return (
            <button
              key={color}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={normalized}
              className="cs-kit-color-swatch cs-kit-focus"
              style={{ background: color }}
              data-selected={selected ? "true" : undefined}
              onClick={() => onPick(normalized)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ColorPicker({
  value = "#111827",
  onChange,
  onClear,
  recentColors = [],
  onRecentAdd,
  allowEyedropper = true,
  defaultExpanded = false,
  className,
}: ColorPickerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hexInput, setHexInput] = useState(value);
  const [rgb, setRgb] = useState(() => hexToRgb(value) ?? { r: 17, g: 24, b: 39 });

  const pickerColor = useMemo(() => normalizeHex(value) ?? "#111827", [value]);

  useEffect(() => {
    setHexInput(pickerColor);
    const next = hexToRgb(pickerColor);
    if (next) setRgb(next);
  }, [pickerColor]);

  const applyColor = useCallback(
    (hex: string) => {
      const normalized = normalizeHex(hex);
      if (!normalized) return;
      onChange(normalized);
      onRecentAdd?.(normalized);
    },
    [onChange, onRecentAdd],
  );

  const handleHexInput = (raw: string) => {
    setHexInput(raw);
    const normalized = normalizeHex(raw);
    if (normalized) applyColor(normalized);
  };

  const handleRgbChange = (channel: "r" | "g" | "b", raw: string) => {
    const num = Number.parseInt(raw, 10);
    if (Number.isNaN(num)) return;
    const next = { ...rgb, [channel]: num };
    setRgb(next);
    applyColor(rgbToHex(next.r, next.g, next.b));
  };

  const handleEyedropper = async () => {
    if (!("EyeDropper" in window)) return;
    try {
      type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };
      const EyeDropper = (window as Window & { EyeDropper: EyeDropperCtor }).EyeDropper;
      const result = await new EyeDropper().open();
      applyColor(result.sRGBHex);
    } catch {
      /* cancelled */
    }
  };

  const recents = recentColors.filter((c) => normalizeHex(c)).slice(0, 10);

  return (
    <div className={cn("cs-kit-color-picker", className)}>
      <SwatchGrid label="Brand" colors={BRAND_SWATCHES} value={pickerColor} onPick={applyColor} />
      <SwatchGrid label="Standard" colors={STANDARD_SWATCHES} value={pickerColor} onPick={applyColor} />
      {recents.length > 0 && (
        <SwatchGrid label="Recent" colors={recents} value={pickerColor} onPick={applyColor} />
      )}

      <div className="cs-kit-color-picker-main">
        <HexColorPicker color={pickerColor} onChange={applyColor} className="cs-kit-color-hsv" />
      </div>

      <div className="cs-kit-color-inputs">
        <div className="cs-kit-color-input-row">
          <span className="cs-kit-color-input-label">Hex</span>
          <Input
            value={hexInput}
            onChange={(e) => handleHexInput(e.target.value)}
            aria-label="Hex color"
            className="cs-kit-color-hex-input"
          />
        </div>
        <div className="cs-kit-color-rgb-row">
          {(["r", "g", "b"] as const).map((ch) => (
            <div key={ch} className="cs-kit-color-input-row">
              <span className="cs-kit-color-input-label">{ch.toUpperCase()}</span>
              <Input
                type="number"
                min={0}
                max={255}
                value={rgb[ch]}
                onChange={(e) => handleRgbChange(ch, e.target.value)}
                aria-label={`${ch.toUpperCase()} color channel`}
                className="cs-kit-color-rgb-input"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="cs-kit-color-actions">
        {allowEyedropper && "EyeDropper" in window && (
          <button type="button" className="cs-kit-color-action-btn cs-kit-focus" onClick={handleEyedropper}>
            <Pipette size={14} strokeWidth={1.75} />
            Eyedropper
          </button>
        )}
        {onClear && (
          <button type="button" className="cs-kit-color-action-btn cs-kit-focus" onClick={onClear}>
            No color
          </button>
        )}
        <button
          type="button"
          className="cs-kit-color-action-btn cs-kit-focus"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Fewer colors…" : "More colors…"}
        </button>
      </div>

      {expanded && (
        <SwatchGrid label="More" colors={EXPANDED_SWATCHES} value={pickerColor} onPick={applyColor} />
      )}
    </div>
  );
}
