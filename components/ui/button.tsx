"use client";

import { cn } from "@/lib/cn";
import { playUiSound } from "@/lib/ui-sound";
import Link from "next/link";
import type { ButtonHTMLAttributes, PointerEvent, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md",
  secondary:
    "border border-border/10 bg-white/80 text-ink hover:-translate-y-0.5 hover:bg-white",
  ghost: "text-ink hover:-translate-y-0.5 hover:bg-white/70",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:-translate-y-0.5 hover:bg-red-100",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-medium",
    "transition-[transform,box-shadow,background-color,opacity,color] duration-150 ease-out motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    "active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:pointer-events-none disabled:opacity-60",
    variantClass[variant],
    sizeClass[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  download?: boolean | string;
  silent?: boolean;
  children: ReactNode;
};

export function Button({
  href,
  download,
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  silent = false,
  type = "button",
  ...rest
}: ButtonProps) {
  const cls = buttonClassName({ variant, size, className });

  function onPress(event: PointerEvent<HTMLElement>) {
    if (!disabled && !silent) playUiSound("press");
    rest.onPointerDown?.(event as PointerEvent<HTMLButtonElement>);
  }

  if (href) {
    if (disabled) {
      return <span className={cn(cls, "pointer-events-none opacity-60")}>{children}</span>;
    }
    if (download) {
      return (
        <a href={href} download={download === true ? true : download} className={cls} onPointerDown={onPress}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} onPointerDown={onPress}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={cls} {...rest} onPointerDown={onPress}>
      {children}
    </button>
  );
}
