import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress, keccak256, toHex, type Address } from "viem";
import { buildQuoteDomain, QUOTE_TYPES } from "@anticipo/shared";
import { runUnderwrite, type UnderwriteServiceConfig } from "../src/server/underwriterService.js";

const underwriter = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

// stub viem public client: reputation empty, pool has liquidity, usedNonce false
const stubClient = {
  readContract: async ({ functionName }: { functionName: string }) => {
    if (functionName === "getBuyerReputation")
      return { paidOnTime: 0, paidLate: 0, defaulted: 0, totalVolumeRepaid: 0n, firstSeen: 0n };
    if (functionName === "totalAssets") return 1_000_000_000n;
    if (functionName === "availableLiquidity") return 1_000_000_000n;
    if (functionName === "outstandingPrincipal") return 0n;
    if (functionName === "usedNonce") return false;
    return 0n;
  },
} as any;

const cfg: UnderwriteServiceConfig = {
  client: stubClient,
  chainId: 421614,
  addresses: {
    registry: "0x0000000000000000000000000000000000000003" as Address,
    pool: "0x0000000000000000000000000000000000000002" as Address,
    controller: "0x0000000000000000000000000000000000000004" as Address,
  },
  signer: underwriter,
  llm: { price: async () => ({ riskScore: 20, advanceRatioBps: 8000, feeBps: 200, rationale: "clean", keyFactors: [] }) },
  now: () => 1_900_000_000,
};

describe("runUnderwrite", () => {
  it("returns a decision + a quote signed by the underwriter, recoverable for the domain", async () => {
    const res = await runUnderwrite(
      {
        smb: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        faceAmount: "100",
        dueDateSec: 1_900_000_000 + 2_592_000,
        docRef: "invoice-001",
      },
      cfg,
    );
    expect(res.decision.advanceRatioBps).toBe(8000);
    expect(res.quote.faceAmount).toBe(100_000_000n);
    expect(res.quote.docHash).toBe(keccak256(toHex("invoice-001")));
    const domain = buildQuoteDomain(421614, cfg.addresses.controller);
    const recovered = await recoverTypedDataAddress({
      domain,
      types: QUOTE_TYPES,
      primaryType: "Quote",
      message: res.quote,
      signature: res.signature,
    });
    expect(recovered.toLowerCase()).toBe(underwriter.address.toLowerCase());
  });

  it("serializes bigints to strings for JSON transport", async () => {
    const res = await runUnderwrite(
      {
        smb: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        faceAmount: "100",
        dueDateSec: 1_900_000_000 + 2_592_000,
        docRef: "x",
      },
      cfg,
    );
    const json = res.toJSON();
    expect(typeof json.quote.faceAmount).toBe("string");
    expect(json.quote.faceAmount).toBe("100000000");
    expect(typeof json.signature).toBe("string");
    // regression: decision.advanceAmount must be serialized too, or NextResponse.json throws
    expect(typeof json.decision.advanceAmount).toBe("string");
    expect(() => JSON.stringify(json)).not.toThrow();
  });
});
