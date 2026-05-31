import { cn } from "@/lib/cn";

type Accent = "terracotta" | "agave" | "sun" | "rose" | "teal";

const accentVar: Record<Accent, string> = {
  terracotta: "#c8553d",
  agave: "#3f7d5b",
  sun: "#e9a93b",
  rose: "#d96c75",
  teal: "#2f8a8a",
};

/** Compact stat tile with a colored left accent bar (pool-stats strip). */
export function Stat({
  label,
  value,
  accent = "terracotta",
  className,
}: {
  label: string;
  value: React.ReactNode;
  accent?: Accent;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-w-[104px] overflow-hidden rounded-field border-[1.5px] border-line bg-card px-3.5 py-2",
        className,
      )}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: accentVar[accent] }} />
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-px font-display text-[17px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}
