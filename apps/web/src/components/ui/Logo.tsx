import { cn } from "@/lib/cn";

/** Anticipo logo: conic sun→terracotta→agave mark (a horizon/peak) + wordmark. */
export function Logo({ size = 42, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="grid place-items-center rounded-[13px] bg-grad-mark shadow-warm"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" fill="none" style={{ width: size * 0.57, height: size * 0.57 }}>
          <path d="M4 14L9 6l4 6 3-4 4 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="6" r="1.6" fill="#fff" />
        </svg>
      </div>
      <span className="font-display text-[27px] font-black tracking-tight text-ink">
        Anti<span className="text-terracotta">cipo</span>
      </span>
    </div>
  );
}
