import type { ReactNode } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "./cn";

export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;

export function DrawerContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="cs-kit-sheet-overlay" />
      <DrawerPrimitive.Content className={cn("cs-kit-drawer-content", "cs-kit-font-ui", className)}>
        <div
          style={{
            width: "var(--space-10)",
            height: "var(--space-1)",
            margin: "0 auto var(--space-4)",
            borderRadius: "var(--radius-pill)",
            background: "var(--border-default)",
          }}
          aria-hidden
        />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}
