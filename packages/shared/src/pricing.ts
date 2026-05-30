import type { BuyerFeatures, InvoiceInput, UnderwritingDecision } from "./types.js";
import type { UnderwriterLLM } from "./llm.js";

export const MAX_ADVANCE_RATIO_BPS = 9500;
export const MAX_FEE_BPS = 2000;

const clampInt = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.trunc(Number.isFinite(v) ? v : lo)));

export async function priceWithLLM(
  features: BuyerFeatures,
  input: InvoiceInput,
  llm: UnderwriterLLM,
): Promise<UnderwritingDecision> {
  const raw = await llm.price({ features, input });

  const advanceRatioBps = clampInt(raw.advanceRatioBps, 0, MAX_ADVANCE_RATIO_BPS);
  const feeBps = clampInt(raw.feeBps, 0, MAX_FEE_BPS);
  const riskScore = clampInt(raw.riskScore, 0, 100);

  const feeAmount = (input.faceAmount * BigInt(feeBps)) / 10_000n;
  let advanceAmount = (input.faceAmount * BigInt(advanceRatioBps)) / 10_000n;
  // Enforce the on-chain invariant advance + fee <= face.
  if (advanceAmount + feeAmount > input.faceAmount) {
    advanceAmount = input.faceAmount > feeAmount ? input.faceAmount - feeAmount : 0n;
  }

  // A zero advance would produce a signed quote the contract always rejects
  // (FactoringController reverts BadTerms on advanceAmount == 0). Surface it as a
  // decline so the caller never submits an always-reverting quote.
  if (advanceAmount === 0n) {
    throw new Error("priceWithLLM: zero advance — underwriter declined or terms not financeable");
  }

  return {
    riskScore,
    advanceRatioBps,
    feeBps,
    advanceAmount,
    rationale: raw.rationale,
    keyFactors: raw.keyFactors,
  };
}
