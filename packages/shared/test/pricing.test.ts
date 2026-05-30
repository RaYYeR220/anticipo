import { describe, it, expect } from "vitest";
import { priceWithLLM } from "../src/pricing.js";
import type { UnderwriterLLM, RawDecision } from "../src/llm.js";
import type { BuyerFeatures, InvoiceInput } from "../src/types.js";

function fakeLLM(raw: RawDecision): UnderwriterLLM {
  return { price: async () => raw };
}

const features = {} as BuyerFeatures; // pricing only forwards features to the LLM; clamps are deterministic
const input: InvoiceInput = {
  smb: "0x0000000000000000000000000000000000000001",
  buyer: "0x0000000000000000000000000000000000000002",
  faceAmount: 100_000_000n,
  dueDate: 2_000_000_000n,
  docHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
};

describe("priceWithLLM", () => {
  it("passes a sane decision through and computes advanceAmount from ratio", async () => {
    const llm = fakeLLM({ riskScore: 20, advanceRatioBps: 8000, feeBps: 200, rationale: "clean", keyFactors: ["6 on-time"] });
    const d = await priceWithLLM(features, input, llm);
    expect(d.advanceRatioBps).toBe(8000);
    expect(d.feeBps).toBe(200);
    expect(d.advanceAmount).toBe(80_000_000n); // 100 * 80%
    expect(d.riskScore).toBe(20);
  });

  it("clamps an over-aggressive LLM to on-chain bounds", async () => {
    const llm = fakeLLM({ riskScore: 5, advanceRatioBps: 9900, feeBps: 50, rationale: "x", keyFactors: [] });
    const d = await priceWithLLM(features, input, llm);
    expect(d.advanceRatioBps).toBe(9500);          // capped at MAX
    expect(d.advanceAmount).toBe(95_000_000n);      // 100 * 95%
  });

  it("clamps fee and guarantees advance + fee <= face", async () => {
    // ratio 9500 -> advance 95; fee 2000 (clamped from 5000) -> 20; 95+20=115 > 100 -> advance reduced to 80
    const llm = fakeLLM({ riskScore: 90, advanceRatioBps: 9500, feeBps: 5000, rationale: "risky", keyFactors: ["default"] });
    const d = await priceWithLLM(features, input, llm);
    expect(d.feeBps).toBe(2000);
    const feeAmount = (100_000_000n * 2000n) / 10_000n; // 20
    expect(d.advanceAmount + feeAmount).toBeLessThanOrEqual(100_000_000n);
    expect(d.advanceAmount).toBe(80_000_000n);
  });

  it("clamps riskScore into 0..100", async () => {
    const llm = fakeLLM({ riskScore: 250, advanceRatioBps: 7000, feeBps: 300, rationale: "x", keyFactors: [] });
    const d = await priceWithLLM(features, input, llm);
    expect(d.riskScore).toBe(100);
  });

  it("throws on a zero advance (decline) instead of returning an always-reverting quote", async () => {
    const llm = fakeLLM({ riskScore: 100, advanceRatioBps: 0, feeBps: 100, rationale: "decline", keyFactors: [] });
    await expect(priceWithLLM(features, input, llm)).rejects.toThrow(/zero advance/);
  });
});
