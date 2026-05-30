import type { Address } from "viem";
import { InvoiceRegistry, LiquidityPool } from "./abi.generated.js";
import type { BuyerFeatures, BuyerReputation, PoolStats } from "./types.js";

export interface ContractAddresses {
  registry: Address;
  pool: Address;
}

interface MinimalPublicClient {
  readContract(args: { address: Address; abi: readonly unknown[]; functionName: string; args?: readonly unknown[] }): Promise<any>;
}

export async function extractFeatures(
  client: MinimalPublicClient,
  addrs: ContractAddresses,
  opts: { buyer: Address; nowSec: number },
): Promise<BuyerFeatures> {
  const rep = await client.readContract({
    address: addrs.registry,
    abi: InvoiceRegistry.abi,
    functionName: "getBuyerReputation",
    args: [opts.buyer],
  });
  const reputation: BuyerReputation = {
    paidOnTime: Number(rep.paidOnTime),
    paidLate: Number(rep.paidLate),
    defaulted: Number(rep.defaulted),
    totalVolumeRepaid: BigInt(rep.totalVolumeRepaid),
    firstSeen: Number(rep.firstSeen),
  };

  const [totalAssets, availableLiquidity, outstandingPrincipal] = await Promise.all([
    client.readContract({ address: addrs.pool, abi: LiquidityPool.abi, functionName: "totalAssets" }) as Promise<bigint>,
    client.readContract({ address: addrs.pool, abi: LiquidityPool.abi, functionName: "availableLiquidity" }) as Promise<bigint>,
    client.readContract({ address: addrs.pool, abi: LiquidityPool.abi, functionName: "outstandingPrincipal" }) as Promise<bigint>,
  ]);

  const total = reputation.paidOnTime + reputation.paidLate + reputation.defaulted;
  const pool: PoolStats = {
    totalAssets,
    availableLiquidity,
    outstandingPrincipal,
    utilization: totalAssets > 0n ? Number(outstandingPrincipal) / Number(totalAssets) : 0,
  };

  return {
    buyer: opts.buyer,
    totalInvoices: total,
    onTimeRate: total > 0 ? reputation.paidOnTime / total : null,
    lateRate: total > 0 ? reputation.paidLate / total : null,
    defaultRate: total > 0 ? reputation.defaulted / total : null,
    totalVolumeRepaid: reputation.totalVolumeRepaid,
    accountAgeDays: reputation.firstSeen > 0 ? Math.floor((opts.nowSec - reputation.firstSeen) / 86_400) : 0,
    reputation,
    pool,
  };
}
