import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "agave" | "sun" | "terracotta" | "neutral";

const tones: Record<Tone, string> = {
  agave: "bg-agave/[0.12] text-agave-deep border-agave/[0.22]",
  sun: "bg-sun/[0.18] text-terracotta-deep border-sun/40",
  terracotta: "bg-terracotta/[0.12] text-terracotta-deep border-terracotta/30",
  neutral: "bg-cream text-ink-soft border-line",
};

/** Pill chip for key-factors / statuses. */
export function Badge({
  children,
  tone = "agave",
  glyph,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  glyph?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-2 text-[12.5px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {glyph ? <span className="leading-none">{glyph}</span> : null}
      {children}
    </span>
  );
}
