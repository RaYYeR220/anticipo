import { describe, it, expect } from "vitest";
import { OpenRouterLLM, buildPrompt, DECISION_JSON_SCHEMA } from "../src/llm.js";
import type { BuyerFeatures, InvoiceInput } from "../src/types.js";

const features: BuyerFeatures = {
  buyer: "0x0000000000000000000000000000000000000002",
  totalInvoices: 7,
  onTimeRate: 0.857,
  lateRate: 0.143,
  defaultRate: 0,
  totalVolumeRepaid: 700_000_000n,
  accountAgeDays: 120,
  reputation: { paidOnTime: 6, paidLate: 1, defaulted: 0, totalVolumeRepaid: 700_000_000n, firstSeen: 1_700_000_000 },
  pool: { totalAssets: 1_000_000_000n, availableLiquidity: 900_000_000n, outstandingPrincipal: 100_000_000n, utilization: 0.1 },
};
const input: InvoiceInput = {
  smb: "0x0000000000000000000000000000000000000001",
  buyer: "0x0000000000000000000000000000000000000002",
  faceAmount: 100_000_000n,
  dueDate: 2_000_000_000n,
  docHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
};

describe("buildPrompt", () => {
  it("includes the buyer's on-chain signal and the invoice face amount", () => {
    const { user } = buildPrompt(features, input);
    expect(user).toContain("6"); // paidOnTime
    expect(user).toContain("defaul"); // mentions defaults
    expect(user).toMatch(/100(\.0+)?/); // 100 USDC face (formatted)
  });
});

describe("OpenRouterLLM", () => {
  it("calls the chat API with the JSON schema and parses the response", async () => {
    const calls: any[] = [];
    const fakeClient = {
      chat: {
        completions: {
          create: async (params: any) => {
            calls.push(params);
            return { choices: [{ message: { content: JSON.stringify({ riskScore: 15, advanceRatioBps: 9000, feeBps: 150, rationale: "clean payer", keyFactors: ["6 on-time"] }) } }] };
          },
        },
      },
    };
    const llm = new OpenRouterLLM({ client: fakeClient as any, model: "google/gemini-2.5-flash" });
    const raw = await llm.price({ features, input });
    expect(raw.advanceRatioBps).toBe(9000);
    expect(raw.riskScore).toBe(15);
    expect(calls[0].model).toBe("google/gemini-2.5-flash");
    expect(calls[0].response_format.json_schema.name).toBe(DECISION_JSON_SCHEMA.name);
  });
});
