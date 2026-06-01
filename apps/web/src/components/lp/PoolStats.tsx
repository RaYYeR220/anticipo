"use client";
import { useAccount } from "wagmi";
import { Card, CardTitle, Stat, Badge } from "@/components/ui";
import { usePool } from "@/hooks/usePool";
import { formatUsdc } from "@/lib/format";

/** Full-width pool headline: TVL, utilization bar, liquidity split. */
export function PoolStats() {
  const { address } = useAccount();
  const { totalAssets, available, outstanding, utilization } = usePool(address);
  const utilPct = Math.min(100, Math.max(0, utilization * 100));

  return (
    <Card className="p-[30px]">
      <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-ink-soft">
            Pool TVL · Total value
          </p>
          <p className="mt-1 font-display text-[48px] font-black leading-none text-ink">
            ${formatUsdc(totalAssets)}
          </p>
          <p className="mt-1.5 text-[13px] text-ink-soft">USDC supplied by liquidity providers</p>
        </div>
        <Badge tone="agave" className="self-start lg:self-end">
          {utilPct.toFixed(1)}% utilized
        </Badge>
      </div>

      {/* Utilization bar: agave fill on an ink/12 track */}
      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between text-[12px] font-bold uppercase tracking-[0.5px] text-ink-soft">
          <span>Utilization</span>
          <span className="text-agave-deep">{utilPct.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.12]">
          <div
            className="h-full rounded-full bg-grad-confirm transition-[width] duration-500"
            style={{ width: `${Math.max(utilPct, utilPct > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>

      {/* Stat tiles — stretch to fill the width */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Available liquidity" value={`$${formatUsdc(available)}`} accent="agave" className="min-w-0" />
        <Stat label="In advances" value={`$${formatUsdc(outstanding)}`} accent="rose" className="min-w-0" />
        <Stat label="Utilization" value={`${utilPct.toFixed(1)}%`} accent="sun" className="min-w-0" />
      </div>
    </Card>
  );
}

/** The connected LP's position (shares, value, share price). */
export function PoolPosition() {
  const { address } = useAccount();
  const { shares, positionValue, sharePrice } = usePool(address);

  return (
    <Card className="flex h-full flex-col p-[30px]">
      <CardTitle sub="Your stake in the pool and its accruing yield.">Your position</CardTitle>
      {address ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Your shares" value={`${formatUsdc(shares)} aUSDC`} accent="terracotta" className="min-w-0" />
            <Stat label="Position value" value={`$${formatUsdc(positionValue)}`} accent="agave" className="min-w-0" />
            <Stat label="Share price" value={sharePrice.toFixed(4)} accent="teal" className="min-w-0" />
          </div>
          <p className="mt-4 text-[13px] text-ink-soft">
            Share price is your yield signal — it grows as advances repay with fees.
          </p>
        </>
      ) : (
        <div className="mt-5 flex flex-1 items-center justify-center rounded-field border border-line bg-cream px-4 py-8 text-center text-[14px] text-ink-soft">
          Connect a wallet to see your position.
        </div>
      )}
    </Card>
  );
}
