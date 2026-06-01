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

/** The connected LP's position — value hero, share-of-pool, shares & price, yield note. */
export function PoolPosition() {
  const { address } = useAccount();
  const { shares, positionValue, sharePrice, totalSupply } = usePool(address);
  const shareOfPool = totalSupply > 0n ? (Number(shares) / Number(totalSupply)) * 100 : 0;
  const yieldPct = (sharePrice - 1) * 100;
  const hasStake = shares > 0n;

  return (
    <Card className="flex h-full flex-col p-[30px]">
      <CardTitle sub="Your stake in the pool and its accruing yield.">Your position</CardTitle>

      {!address ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-3 rounded-field border border-dashed border-line bg-cream/60 px-4 py-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-agave/[0.12] text-2xl">🌱</div>
          <p className="max-w-[240px] text-[14px] text-ink-soft">
            Connect a wallet to see your shares, value, and accruing yield.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-1 flex-col gap-5">
          {/* Position value hero */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-ink-soft">Position value</p>
            <div className="mt-1 flex flex-wrap items-end gap-3">
              <span className="font-display text-[40px] font-black leading-none text-ink">
                ${formatUsdc(positionValue)}
              </span>
              {yieldPct > 0.005 ? <Badge tone="agave">▲ {yieldPct.toFixed(2)}% yield</Badge> : null}
            </div>
          </div>

          {/* Share of pool */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.5px] text-ink-soft">
              <span>Share of pool</span>
              <span className="text-agave-deep">{shareOfPool.toFixed(2)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink/[0.12]">
              <div
                className="h-full rounded-full bg-grad-payoff transition-[width] duration-500"
                style={{ width: `${Math.max(shareOfPool, shareOfPool > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>

          {/* Shares + price */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Your shares" value={`${formatUsdc(shares)} aUSDC`} accent="terracotta" className="min-w-0" />
            <Stat label="Share price" value={sharePrice.toFixed(4)} accent="teal" className="min-w-0" />
          </div>

          <p className="mt-auto text-[13px] leading-relaxed text-ink-soft">
            {hasStake
              ? "Share price grows as financed invoices repay with fees — that's your yield, auto-compounding into every aUSDC share."
              : "You haven't supplied liquidity yet. Deposit USDC on the right to start earning the factoring spread."}
          </p>
        </div>
      )}
    </Card>
  );
}
