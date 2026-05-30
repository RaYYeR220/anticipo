import OpenAI from "openai";
import { formatUnits } from "viem";
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

export function buildPrompt(features: BuyerFeatures, input: InvoiceInput): { system: string; user: string } {
  const face = formatUnits(input.faceAmount, 6);
  const r = features.reputation;
  const system =
    "You are Anticipo's invoice-factoring underwriter. Price an advance on an unpaid B2B invoice " +
    "using ONLY the buyer's verifiable on-chain payment history and the pool's liquidity. A buyer who " +
    "pays on time deserves a high advance ratio and low fee; late/defaulting buyers get a lower ratio and " +
    "higher fee. Be conservative when history is thin. Respond ONLY with the required JSON.";
  const user = [
    `Invoice face amount: ${face} USDC, due ${new Date(Number(input.dueDate) * 1000).toISOString().slice(0, 10)}.`,
    `Buyer ${input.buyer} on-chain history:`,
    `- invoices settled: ${features.totalInvoices} (paid on time: ${r.paidOnTime}, late: ${r.paidLate}, defaulted: ${r.defaulted})`,
    `- on-time rate: ${features.onTimeRate === null ? "no history" : (features.onTimeRate * 100).toFixed(0) + "%"}`,
    `- default rate: ${features.defaultRate === null ? "no history" : (features.defaultRate * 100).toFixed(0) + "%"}`,
    `- total volume repaid: ${formatUnits(features.totalVolumeRepaid, 6)} USDC, account age: ${features.accountAgeDays} days`,
    `Pool utilization: ${(features.pool.utilization * 100).toFixed(0)}% (available ${formatUnits(features.pool.availableLiquidity, 6)} USDC).`,
    `Return advanceRatioBps (0-9500), feeBps (0-2000), riskScore (0-100), a one-sentence rationale citing these signals, and keyFactors.`,
  ].join("\n");
  return { system, user };
}

export interface OpenRouterLLMOptions {
  apiKey?: string;
  model?: string;
  client?: OpenAI; // injectable for tests
  baseURL?: string;
}

export class OpenRouterLLM implements UnderwriterLLM {
  private client: OpenAI;
  private model: string;
  constructor(opts: OpenRouterLLMOptions = {}) {
    this.model = opts.model ?? process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
    this.client =
      opts.client ??
      new OpenAI({
        apiKey: opts.apiKey ?? process.env.OPENROUTER_API_KEY ?? "",
        baseURL: opts.baseURL ?? "https://openrouter.ai/api/v1",
      });
  }
  async price(args: { features: BuyerFeatures; input: InvoiceInput }): Promise<RawDecision> {
    const { system, user } = buildPrompt(args.features, args.input);
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: DECISION_JSON_SCHEMA },
    } as any);
    const content = res.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenRouterLLM: empty completion");
    const parsed = JSON.parse(content) as RawDecision;
    return parsed;
  }
}
