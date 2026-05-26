import type { ComponentPropsWithoutRef, ReactNode } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "./cn";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  variant = "segmented",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  variant?: "segmented" | "underline";
}) {
  return (
    <TabsPrimitive.List
      className={cn(
        variant === "underline" ? "cs-kit-tabs-list-underline" : "cs-kit-tabs-list-segmented",
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({
  variant = "segmented",
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  variant?: "segmented" | "underline";
}) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "cs-kit-focus",
        variant === "underline" ? "cs-kit-tabs-trigger-underline" : "cs-kit-tabs-trigger-segmented",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("cs-kit-font-ui", className)}
      style={{ paddingTop: "var(--space-4)" }}
      {...props}
    />
  );
}

export type TabsProps = { children: ReactNode };
