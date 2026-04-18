"use client";

import { clsx } from "clsx";
import { forwardRef } from "react";

type Variant = "default" | "primary" | "accent" | "ghost";
type Size = "md" | "sm" | "icon";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "md", block, type = "button", ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "btn",
        variant === "primary" && "primary",
        variant === "accent" && "accent",
        variant === "ghost" && "ghost",
        size === "sm" && "sm",
        size === "icon" && "icon",
        block && "block",
        className,
      )}
      {...rest}
    />
  ),
);

Button.displayName = "Button";
