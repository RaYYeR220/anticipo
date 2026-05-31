"use client";
import { useAccount } from "wagmi";
import { Card, CardTitle, Stat, Badge } from "@/components/ui";
import { usePool } from "@/hooks/usePool";
import { formatUsdc } from "@/lib/format";
import { cn } from "@/lib/cn";

/** LP-facing pool overview: TVL, liquidity split, utilization bar, and the connected LP's position. */
export function PoolStats() {
  const { address } = useAccount();
  const { totalAssets, available, outstanding, shares, positionValue, utilization, sharePrice } =
    usePool(address);
  const utilPct = Math.min(100, Math.max(0, utilization * 100));

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Pool TVL — the warm headline number */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-ink-soft">
              Pool TVL · Total value
            </p>
            <p className="mt-1 font-display text-[44px] font-black leading-none text-ink">
              ${formatUsdc(totalAssets)}
            </p>
            <p className="mt-1.5 text-[13px] text-ink-soft">USDC supplied by liquidity providers</p>
          </div>
          <Badge tone="agave">
            {utilPct.toFixed(0)}% utilized
          </Badge>
        </div>

        {/* Utilization bar: agave fill on an ink/10 track */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[12px] font-bold uppercase tracking-[0.5px] text-ink-soft">
            <span>Utilization</span>
            <span className="text-agave-deep">{utilPct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-agave transition-[width] duration-500"
              style={{ width: `${utilPct}%` }}
            />
          </div>
        </div>

        {/* Stat tiles */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Stat label="Available liquidity" value={`$${formatUsdc(available)}`} accent="agave" />
          <Stat label="Utilization" value={`${utilPct.toFixed(0)}%`} accent="sun" />
          <Stat label="In advances" value={`$${formatUsdc(outstanding)}`} accent="rose" />
        </div>
      </Card>

      {/* The connected LP's position */}
      <Card>
        <CardTitle>Your position</CardTitle>
        {address ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <Stat label="Your shares" value={`${formatUsdc(shares)} aUSDC`} accent="terracotta" />
              <Stat label="Position value" value={`$${formatUsdc(positionValue)}`} accent="agave" />
              <Stat label="Share price" value={`${sharePrice.toFixed(4)}`} accent="teal" />
            </div>
            <p className="mt-3 text-[13px] text-ink-soft">
              Share price is your yield signal — it grows as advances repay with fees.
            </p>
          </>
        ) : (
          <div
            className={cn(
              "mt-3 rounded-[14px] border border-line bg-cream px-4 py-5 text-center",
              "text-[14px] text-ink-soft",
            )}
          >
            Connect to see your position.
          </div>
        )}
      </Card>
    </div>
  );
}
