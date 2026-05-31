import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "confirm" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold leading-none cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none";

const variants: Record<Variant, string> = {
  // terracotta — "request a quote" / primary actions
  primary: "bg-grad-primary text-white shadow-btn-primary hover:-translate-y-0.5 active:translate-y-0",
  // agave — "accept / receive money" commit actions (Fraunces, weightier)
  confirm:
    "bg-grad-confirm text-white shadow-btn-confirm font-display font-black hover:-translate-y-0.5 active:translate-y-0",
  ghost: "bg-card text-ink border-[1.5px] border-line hover:border-sun",
};

const sizes: Record<Size, string> = {
  md: "rounded-btn px-5 py-[15px] text-[15.5px]",
  lg: "rounded-[17px] px-6 py-[17px] text-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function Button({ variant = "primary", size = "md", fullWidth, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
}
