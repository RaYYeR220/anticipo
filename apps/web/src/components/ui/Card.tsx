import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative rounded-card border-[1.5px] border-line bg-card shadow-warm", className)}
      {...props}
    />
  );
}

/** Section title in Fraunces, optional leading glyph/emoji + subtitle. */
export function CardTitle({
  children,
  glyph,
  sub,
  className,
}: {
  children: ReactNode;
  glyph?: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="flex items-center gap-3 font-display text-[25px] font-black tracking-tight">
        {glyph ? <span className="text-2xl leading-none">{glyph}</span> : null}
        {children}
      </h2>
      {sub ? <p className="mt-1 text-[13.5px] text-ink-soft">{sub}</p> : null}
    </div>
  );
}

/** The agave gradient header band (used by the AI / underwriting card). */
export function CardHeaderBand({
  children,
  right,
  className,
}: {
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-between overflow-hidden bg-grad-ai-head px-[30px] py-6 text-cream",
        className,
      )}
    >
      {/* faint dotted overlay */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(circle at 12px 12px, rgba(255,255,255,0.10) 2px, transparent 3px)",
          backgroundSize: "24px 24px",
        }}
      />
      <h2 className="relative flex items-center gap-2.5 font-display text-[23px] font-black">{children}</h2>
      {right ? <div className="relative">{right}</div> : null}
    </div>
  );
}
