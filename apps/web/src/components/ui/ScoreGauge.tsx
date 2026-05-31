import { cn } from "@/lib/cn";

export type RiskBand = "low" | "medium" | "high";

export function riskBand(score: number): RiskBand {
  if (score <= 33) return "low";
  if (score <= 66) return "medium";
  return "high";
}

const ARC: Record<RiskBand, string> = { low: "#3f7d5b", medium: "#e9a93b", high: "#c8553d" };
const NUM: Record<RiskBand, string> = { low: "#275a3e", medium: "#9e3b29", high: "#9e3b29" };

/** Conic risk gauge. score 0..100; color follows the risk band. */
export function ScoreGauge({ score, size = 128, className }: { score: number; size?: number; className?: string }) {
  const band = riskBand(score);
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${ARC[band]} ${clamped}%, rgba(58,36,24,0.10) 0)` }}
      />
      <div
        className="absolute rounded-full bg-card"
        style={{ inset: Math.round(size * 0.1), boxShadow: "inset 0 2px 8px rgba(58,36,24,0.10)" }}
      />
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display font-black leading-none" style={{ fontSize: size * 0.27, color: NUM[band] }}>
            {clamped}
          </div>
          <div className="mt-0.5 text-[12px] text-ink-soft">/ 100</div>
        </div>
      </div>
    </div>
  );
}
