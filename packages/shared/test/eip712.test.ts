import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress } from "viem";
import { buildQuoteDomain, QUOTE_TYPES } from "../src/eip712.js";
import type { Quote } from "../src/types.js";

const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"); // anvil key #1

const quote: Quote = {
  smb: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  faceAmount: 100_000_000n,
  dueDate: 2_000_000_000,
  advanceRatioBps: 8000,
  feeBps: 200,
  advanceAmount: 80_000_000n,
  docHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
  expiry: 2_000_003_600,
  nonce: 1n,
};

describe("eip712", () => {
  it("signs and recovers the signer over the Quote typed data", async () => {
    const domain = buildQuoteDomain(421614, "0x5FbDB2315678afecb367f032d93F642f64180aa3");
    const signature = await account.signTypedData({ domain, types: QUOTE_TYPES, primaryType: "Quote", message: quote });
    const recovered = await recoverTypedDataAddress({ domain, types: QUOTE_TYPES, primaryType: "Quote", message: quote, signature });
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("changes the signature when chainId or contract differ (domain binding)", async () => {
    const d1 = buildQuoteDomain(421614, "0x5FbDB2315678afecb367f032d93F642f64180aa3");
    const d2 = buildQuoteDomain(1, "0x5FbDB2315678afecb367f032d93F642f64180aa3");
    const s1 = await account.signTypedData({ domain: d1, types: QUOTE_TYPES, primaryType: "Quote", message: quote });
    const s2 = await account.signTypedData({ domain: d2, types: QUOTE_TYPES, primaryType: "Quote", message: quote });
    expect(s1).not.toBe(s2);
  });
});
