import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "./cn";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  tooltip?: string;
  pressed?: boolean;
  selected?: boolean;
  loading?: boolean;
  error?: boolean;
  children: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    className,
    tooltip,
    pressed,
    selected,
    loading,
    error,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      className={cn("cs-kit-icon-btn", "cs-kit-focus", className)}
      disabled={disabled || loading}
      data-pressed={pressed ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-loading={loading ? "true" : undefined}
      data-error={error ? "true" : undefined}
      {...props}
    >
      {loading ? <Loader2 className="cs-kit-icon-btn-spinner" size={16} strokeWidth={1.75} /> : children}
    </button>
  );

  if (!tooltip) return button;

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="cs-kit-tooltip-content" sideOffset={4}>
            {tooltip}
            <TooltipPrimitive.Arrow />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
});

IconButton.displayName = "IconButton";
