import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The sun→terracotta money block — the emotional payoff (advance amount). */
export function PayoffBlock({
  caption,
  amount,
  unit = "USDC",
  breakdown,
  className,
}: {
  caption: ReactNode;
  amount: ReactNode;
  unit?: string;
  breakdown?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[20px] bg-grad-payoff p-6 text-white shadow-warm", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.25), transparent 70%)" }}
      />
      <div className="relative text-[13px] font-semibold opacity-95">{caption}</div>
      <div className="relative my-1 font-display text-[58px] font-black leading-[0.95] tracking-tight tabular-nums">
        {amount} <span className="text-2xl font-semibold opacity-90">{unit}</span>
      </div>
      {breakdown ? <div className="relative mt-2 text-[12.5px] leading-snug opacity-95">{breakdown}</div> : null}
    </div>
  );
}
