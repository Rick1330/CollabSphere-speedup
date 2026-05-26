import type { ComponentPropsWithoutRef, ReactNode } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "./cn";

export type AvatarSize = "sm" | "md" | "lg";

const sizeClass: Record<AvatarSize, string> = {
  sm: "cs-kit-avatar-sm",
  md: "cs-kit-avatar-md",
  lg: "cs-kit-avatar-lg",
};

export type AvatarProps = {
  src?: string;
  alt: string;
  fallback: string;
  size?: AvatarSize;
  presence?: boolean;
  className?: string;
};

export function Avatar({ src, alt, fallback, size = "md", presence, className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn("cs-kit-avatar", sizeClass[size], presence && "cs-kit-avatar-presence", className)}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={alt} className="h-full w-full object-cover" /> : null}
      <AvatarPrimitive.Fallback delayMs={0}>{fallback}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export type AvatarStackProps = {
  children: ReactNode;
  className?: string;
};

export function AvatarStack({ children, className }: AvatarStackProps) {
  return <div className={cn("cs-kit-avatar-stack", className)}>{children}</div>;
}

export type AvatarImageProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>;
