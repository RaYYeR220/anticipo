"use client";
import { useReadContracts } from "wagmi";
import { zeroAddress } from "viem";
import { poolAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";

export function usePool(account?: `0x${string}`) {
  const { addresses } = publicConfig();
  const pool = { address: addresses.pool, abi: poolAbi } as const;
  const { data, refetch, isLoading } = useReadContracts({
    contracts: [
      { ...pool, functionName: "totalAssets" },
      { ...pool, functionName: "availableLiquidity" },
      { ...pool, functionName: "outstandingPrincipal" },
      { ...pool, functionName: "totalSupply" },
      { ...pool, functionName: "balanceOf", args: [account ?? zeroAddress] },
    ],
    query: { refetchInterval: 5000 },
  });
  // NB: destructuring an empty array yields `undefined`, so coalesce per-index
  // (the `?? 0n` must live OUTSIDE the map, which doesn't run when data is absent).
  const r = (data ?? []).map((d) => (d?.result as bigint | undefined) ?? 0n);
  const totalAssets = r[0] ?? 0n;
  const available = r[1] ?? 0n;
  const outstanding = r[2] ?? 0n;
  const totalSupply = r[3] ?? 0n;
  const shares = r[4] ?? 0n;
  const utilization = totalAssets > 0n ? Number(outstanding) / Number(totalAssets) : 0;
  // 1 share's value, and the connected LP's position value (mirrors convertToAssets, sans virtual-share rounding).
  const positionValue = totalSupply > 0n ? (shares * totalAssets) / totalSupply : 0n;
  const sharePrice = totalSupply > 0n ? Number(totalAssets) / Number(totalSupply) : 1;
  return { totalAssets, available, outstanding, totalSupply, shares, positionValue, utilization, sharePrice, refetch, isLoading };
}
