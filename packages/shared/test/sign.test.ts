import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress, keccak256, toHex } from "viem";
import { buildQuote, signQuote } from "../src/sign.js";
import { buildQuoteDomain, QUOTE_TYPES } from "../src/eip712.js";
import type { InvoiceInput, UnderwritingDecision } from "../src/types.js";

const underwriter = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

const input: InvoiceInput = {
  smb: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  faceAmount: 100_000_000n,
  dueDate: 2_000_000_000n,
  docHash: keccak256(toHex("invoice-xyz")),
};
const decision: UnderwritingDecision = {
  riskScore: 20, advanceRatioBps: 8000, feeBps: 200, advanceAmount: 80_000_000n, rationale: "clean", keyFactors: [],
};

describe("buildQuote / signQuote", () => {
  it("builds a Quote from input + decision with the given nonce/expiry", () => {
    const q = buildQuote(input, decision, { nonce: 5n, expiry: 2_000_003_600n });
    expect(q.smb).toBe(input.smb);
    expect(q.advanceAmount).toBe(80_000_000n);
    expect(q.advanceRatioBps).toBe(8000);
    expect(q.docHash).toBe(input.docHash);
    expect(q.nonce).toBe(5n);
  });

  it("signs a quote that recovers to the underwriter for the bound domain", async () => {
    const q = buildQuote(input, decision, { nonce: 5n, expiry: 2_000_003_600n });
    const domain = buildQuoteDomain(421614, "0x5FbDB2315678afecb367f032d93F642f64180aa3");
    const sig = await signQuote(underwriter, domain, q);
    const recovered = await recoverTypedDataAddress({ domain, types: QUOTE_TYPES, primaryType: "Quote", message: q, signature: sig });
    expect(recovered.toLowerCase()).toBe(underwriter.address.toLowerCase());
  });
});
