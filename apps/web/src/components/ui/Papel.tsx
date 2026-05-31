import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Papel-picado banner strip (CSS mask). Use terracotta on top, agave on bottom. */
export function PapelBanner({ variant = "terracotta", className }: { variant?: "terracotta" | "agave"; className?: string }) {
  const color = variant === "agave" ? "#3f7d5b" : "#c8553d";
  return (
    <div
      aria-hidden
      className={cn("w-full", className)}
      style={{
        height: 26,
        background: color,
        WebkitMask: "radial-gradient(12px 16px at 16px 0, transparent 96%, #000) repeat-x",
        mask: "radial-gradient(12px 16px at 16px 0, transparent 96%, #000) repeat-x",
        WebkitMaskSize: "32px 26px",
        maskSize: "32px 26px",
        opacity: 0.9,
      }}
    />
  );
}

/** Tagline ribbon: italic Fraunces phrase + dashed sun rule + optional right note. */
export function Ribbon({ phrase, note, className }: { phrase: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3.5 text-[13.5px] text-ink-soft", className)}>
      <b className="font-display font-semibold italic text-terracotta-deep">{phrase}</b>
      <span
        aria-hidden
        className="h-0.5 flex-1"
        style={{ background: "repeating-linear-gradient(90deg, #e9a93b 0 10px, transparent 10px 18px)" }}
      />
      {note ? <span className="hidden sm:inline">{note}</span> : null}
    </div>
  );
}
