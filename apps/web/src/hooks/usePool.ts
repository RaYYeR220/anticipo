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
  const [totalAssets, available, outstanding, totalSupply, shares] = (data ?? []).map(
    (d) => (d.result as bigint) ?? 0n,
  );
  const utilization = totalAssets > 0n ? Number(outstanding) / Number(totalAssets) : 0;
  // 1 share's value, and the connected LP's position value (mirrors convertToAssets, sans virtual-share rounding).
  const positionValue = totalSupply > 0n ? (shares * totalAssets) / totalSupply : 0n;
  const sharePrice = totalSupply > 0n ? Number(totalAssets) / Number(totalSupply) : 1;
  return { totalAssets, available, outstanding, totalSupply, shares, positionValue, utilization, sharePrice, refetch, isLoading };
}
