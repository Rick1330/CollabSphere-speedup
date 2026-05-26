import type { ComponentPropsWithoutRef, InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "./cn";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";

export type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("cs-kit-field", className)}>
      {label ? <label className="cs-kit-field-label">{label}</label> : null}
      {children}
      {error ? <span className="cs-kit-field-error" role="alert">{error}</span> : null}
      {!error && hint ? <span className="cs-kit-field-hint">{hint}</span> : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={cn("cs-kit-input", "cs-kit-focus", className)}
      data-error={error ? "true" : undefined}
      {...props}
    />
  );
}

export type SelectOption = { value: string; label: string };

export type SelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

export function Select({ value, onValueChange, options, placeholder, disabled }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger className={cn("cs-kit-select-trigger", "cs-kit-focus")} aria-label={placeholder}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={14} strokeWidth={1.75} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="cs-kit-select-content" position="popper" sideOffset={4}>
          <SelectPrimitive.Viewport>
            {options.map((opt) => (
              <SelectPrimitive.Item key={opt.value} value={opt.value} className="cs-kit-select-item cs-kit-focus">
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check size={14} strokeWidth={1.75} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export type ComboboxProps = {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
};

export function Combobox({ options, value, onValueChange, placeholder = "Search…" }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn("cs-kit-select-trigger", "cs-kit-focus")}>
          {selected?.label ?? placeholder}
          <ChevronDown size={14} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="cs-kit-combobox-popover" align="start">
        <Command>
          <CommandInput placeholder={placeholder} className="cs-kit-command-input" />
          <CommandList className="cs-kit-command-list">
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  className="cs-kit-command-item"
                  onSelect={() => {
                    onValueChange?.(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type NumberStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
};

export function NumberStepper({ value, onChange, min = 0, max = 99, step = 1, disabled }: NumberStepperProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <div className="cs-kit-stepper">
      <button type="button" className="cs-kit-stepper-btn cs-kit-focus" onClick={dec} disabled={disabled || value <= min} aria-label="Decrease">
        <Minus size={14} strokeWidth={1.75} />
      </button>
      <span className="cs-kit-stepper-value">{value}</span>
      <button type="button" className="cs-kit-stepper-btn cs-kit-focus" onClick={inc} disabled={disabled || value >= max} aria-label="Increase">
        <Plus size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export type SliderProps = ComponentPropsWithoutRef<typeof SliderPrimitive.Root>;

export function Slider({ className, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root className={cn("cs-kit-slider-root", className)} {...props}>
      <SliderPrimitive.Track className="cs-kit-slider-track">
        <SliderPrimitive.Range className="cs-kit-slider-range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="cs-kit-slider-thumb cs-kit-focus" />
    </SliderPrimitive.Root>
  );
}
