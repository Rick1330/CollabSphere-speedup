import type { ComponentPropsWithoutRef, ReactNode } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "./cn";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content className={cn("cs-kit-menu-content", className)} sideOffset={4} {...props}>
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenu.Item>) {
  return (
    <DropdownMenu.Item className={cn("cs-kit-menu-item", "cs-kit-focus", className)} {...props}>
      {children}
    </DropdownMenu.Item>
  );
}

export function MenuShortcut({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"span">) {
  return (
    <span className={cn("cs-kit-menu-shortcut", className)} {...props}>
      {children}
    </span>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="cs-kit-menu-separator" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className="cs-kit-menu-label">{children}</DropdownMenu.Label>;
}

export function MenuSubmenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className={cn("cs-kit-menu-item", "cs-kit-focus")}>{label}</DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent className="cs-kit-menu-content" sideOffset={4}>
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}
