import type { BuyerFeatures, InvoiceInput } from "./types.js";

export interface RawDecision {
  riskScore: number;
  advanceRatioBps: number;
  feeBps: number;
  rationale: string;
  keyFactors: string[];
}

export interface UnderwriterLLM {
  price(args: { features: BuyerFeatures; input: InvoiceInput }): Promise<RawDecision>;
}

/// JSON schema enforced via OpenRouter structured outputs. The model returns ratio/fee/score
/// + rationale; advanceAmount is computed deterministically by priceWithLLM (not by the model).
export const DECISION_JSON_SCHEMA = {
  name: "underwriting_decision",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["riskScore", "advanceRatioBps", "feeBps", "rationale", "keyFactors"],
    properties: {
      riskScore: { type: "integer", minimum: 0, maximum: 100 },
      advanceRatioBps: { type: "integer", minimum: 0, maximum: 9500 },
      feeBps: { type: "integer", minimum: 0, maximum: 2000 },
      rationale: { type: "string" },
      keyFactors: { type: "array", items: { type: "string" } },
    },
  },
} as const;
