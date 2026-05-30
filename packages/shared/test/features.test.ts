import { describe, it, expect } from "vitest";
import { extractFeatures } from "../src/features.js";
import type { Address } from "viem";

// Minimal stub of the viem PublicClient surface extractFeatures uses.
function stubClient(map: Record<string, any>) {
  return {
    readContract: async ({ functionName }: { functionName: string }) => map[functionName],
  } as any;
}

const addrs = {
  registry: "0x0000000000000000000000000000000000000aaa" as Address,
  pool: "0x0000000000000000000000000000000000000bbb" as Address,
};
const buyer = "0x0000000000000000000000000000000000000002" as Address;

describe("extractFeatures", () => {
  it("maps reputation + pool stats into features with rates and age", async () => {
    const nowSec = 1_700_000_000 + 120 * 86_400; // 120 days after firstSeen
    const client = stubClient({
      getBuyerReputation: { paidOnTime: 6, paidLate: 1, defaulted: 0, totalVolumeRepaid: 700_000_000n, firstSeen: 1_700_000_000n },
      totalAssets: 1_000_000_000n,
      availableLiquidity: 900_000_000n,
      outstandingPrincipal: 100_000_000n,
    });
    const f = await extractFeatures(client, addrs, { buyer, nowSec });
    expect(f.totalInvoices).toBe(7);
    expect(f.onTimeRate).toBeCloseTo(6 / 7, 5);
    expect(f.defaultRate).toBe(0);
    expect(f.accountAgeDays).toBe(120);
    expect(f.pool.utilization).toBeCloseTo(0.1, 5);
    expect(f.totalVolumeRepaid).toBe(700_000_000n);
  });

  it("returns null rates for a buyer with no history", async () => {
    const client = stubClient({
      getBuyerReputation: { paidOnTime: 0, paidLate: 0, defaulted: 0, totalVolumeRepaid: 0n, firstSeen: 0n },
      totalAssets: 1_000_000_000n,
      availableLiquidity: 1_000_000_000n,
      outstandingPrincipal: 0n,
    });
    const f = await extractFeatures(client, addrs, { buyer, nowSec: 1_800_000_000 });
    expect(f.totalInvoices).toBe(0);
    expect(f.onTimeRate).toBeNull();
    expect(f.defaultRate).toBeNull();
    expect(f.accountAgeDays).toBe(0);
    expect(f.pool.utilization).toBe(0);
  });
});
