"use client";
import { useWallet } from "@/lib/wallet";
import { Stat } from "@/components/ui";
import { usePool } from "@/hooks/usePool";
import { formatUsdc } from "@/lib/format";

/** Live pool-stats strip used in the app header. */
export function PoolStrip() {
  const { address } = useWallet();
  const { totalAssets, available, outstanding, utilization } = usePool(address);
  return (
    <div className="flex flex-wrap gap-2">
      <Stat label="Pool TVL" value={`$${formatUsdc(totalAssets)}`} accent="terracotta" />
      <Stat label="Available" value={`$${formatUsdc(available)}`} accent="agave" />
      <Stat label="Utilization" value={`${(utilization * 100).toFixed(0)}%`} accent="sun" />
      <Stat label="In advances" value={`$${formatUsdc(outstanding)}`} accent="rose" />
    </div>
  );
}
