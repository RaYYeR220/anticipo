# Anticipo — Phase 2 (AI Underwriter + shared SDK) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/shared` — a TypeScript SDK that reads a buyer's on-chain reputation, prices an advance with Gemini (via OpenRouter) behind a mockable interface, and signs an EIP-712 `Quote` that the deployed `FactoringController` accepts — proven end-to-end against a local anvil.

**Architecture:** One framework-agnostic package consumed later by the Next.js app (Phase 3). Pure, separately-testable units: contract ABIs/bytecode (generated from forge artifacts), EIP-712 domain/types, on-chain feature extraction (viem reads), an `UnderwriterLLM` interface with an OpenRouter/Gemini implementation, deterministic pricing clamps, EIP-712 signing, and an `underwrite()` orchestrator. The LLM is injected so unit tests never call a real API; a final anvil integration test proves the TS-signed quote is accepted on-chain.

**Tech Stack:** TypeScript (NodeNext, ESM), pnpm workspace, vitest, viem v2 (chain reads + EIP-712 signing + anvil deploy), openai SDK pointed at OpenRouter (Gemini, JSON-schema structured output). Builds on Phase 1 contracts (already on `main`).

---

## Context for the implementer (read once)

Phase 1 is complete and merged to `main`: four contracts in `packages/contracts` with 29 passing Foundry tests. The deployed `FactoringController` verifies an EIP-712 `Quote` signed by a registered `underwriter` address. **This package's signer MUST match the contract exactly** (verified by Task 7's anvil round-trip):

- Domain: `EIP712("Anticipo", "1")`, bound to `chainId` + the controller's address.
- Struct (field order is load-bearing): `Quote(address smb,address buyer,uint256 faceAmount,uint64 dueDate,uint16 advanceRatioBps,uint16 feeBps,uint256 advanceAmount,bytes32 docHash,uint64 expiry,uint256 nonce)`.
- On-chain clamps the signer must respect: `advanceRatioBps ≤ 9500`, `feeBps ≤ 2000`, `advanceAmount > 0`, `advanceAmount ≤ faceAmount*advanceRatioBps/10000`, `advanceAmount + faceAmount*feeBps/10000 ≤ faceAmount`. `nonce` must be unique per quote (`usedNonce` rejects replay). `requestFinancing` requires `msg.sender == q.smb`.
- Reputation read (the AI's signal): `getBuyerReputation(address) → (uint32 paidOnTime, uint32 paidLate, uint32 defaulted, uint256 totalVolumeRepaid, uint64 firstSeen)`. Pool stats: `totalAssets()`, `availableLiquidity()`, `outstandingPrincipal()`. Invoice: `getInvoice(uint256) → Invoice` (check `status != 0/None`).

> **Type convention (applied throughout; corrected after Task 2 review):** `Quote.dueDate`, `Quote.expiry`, and `InvoiceInput.dueDate` are **`bigint`** — viem infers EIP-712 `uint64` fields as `bigint`, so `number` causes `tsc` errors at `signTypedData` call sites. `advanceRatioBps`/`feeBps` (uint16) stay `number`. Consequences in later tasks: all `dueDate`/`expiry` test literals use the `n` suffix (e.g. `2_000_000_000n`); `buildPrompt` formats the date via `new Date(Number(input.dueDate) * 1000)`; `underwrite` computes `expiry: BigInt(deps.nowSec + ttl)`; the anvil test uses `dueDate: block.timestamp + 30n * 86_400n` (viem's `block.timestamp` is already `bigint`) and passes `nowSec: Number(block.timestamp)`.

Environment: Windows 11; bash via the Bash tool (git-bash); Node v24, npm 11; `forge`/`cast`/`anvil` 1.7.1 on PATH; `pnpm` not yet installed (Task 1 enables it via corepack). Work on a branch `feat/phase2-underwriter` off `main` (the controller/coordinator sets this up, not the implementer). CRLF git warnings on Windows are expected/harmless.

---

## File Structure (Phase 2)

```
packages/shared/
  package.json              # @anticipo/shared (ESM); deps viem, openai; dev vitest, typescript, tsx, @types/node
  tsconfig.json             # NodeNext, strict, resolveJsonModule
  vitest.config.ts
  scripts/
    gen-abi.mjs             # reads packages/contracts/out/*.json -> src/abi.generated.ts
  src/
    index.ts                # barrel
    abi.generated.ts        # GENERATED + committed: {abi,bytecode} for the 4 contracts
    types.ts                # Quote, InvoiceInput, BuyerReputation, BuyerFeatures, PoolStats, UnderwritingDecision
    eip712.ts               # buildQuoteDomain(chainId, controller), QUOTE_TYPES, primaryType
    features.ts             # extractFeatures(publicClient, addrs, {buyer, nowSec}) -> BuyerFeatures
    llm.ts                  # UnderwriterLLM interface, RawDecision, DECISION_JSON_SCHEMA, buildPrompt, OpenRouterLLM
    pricing.ts             # priceWithLLM(features, input, llm) -> UnderwritingDecision (clamps)
    sign.ts                 # buildQuote(...), signQuote(account, domain, quote) -> hex signature
    underwrite.ts           # underwrite(deps) orchestrator
  test/
    eip712.test.ts
    pricing.test.ts
    features.test.ts
    sign.test.ts
    helpers/anvil.ts        # startAnvil()/stop — spawn anvil, wait for ready
    helpers/deploy.ts       # deployStack(walletClient, publicClient) -> addresses
    integration.anvil.test.ts
```

Each unit has one responsibility and a narrow interface; the LLM and chain client are injected so every unit is testable in isolation, with one end-to-end anvil test for cross-stack confidence.

---

## Task 1: Enable pnpm + scaffold `@anticipo/shared` + generate ABIs

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`
- Create: `packages/shared/scripts/gen-abi.mjs`
- Create: `packages/shared/src/index.ts`
- Generated: `packages/shared/src/abi.generated.ts`

- [ ] **Step 1: Enable pnpm via corepack**

Run: `corepack enable pnpm && corepack prepare pnpm@9.15.0 --activate && pnpm -v`
Expected: prints `9.15.0` (or close). If `corepack enable` errors on permissions, run `npm i -g pnpm@9.15.0 && pnpm -v` instead.

- [ ] **Step 2: Create `packages/shared/package.json`**

```json
{
  "name": "@anticipo/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "gen:abi": "node scripts/gen-abi.mjs",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "viem": "^2.21.0",
    "openai": "^4.67.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 3: Create `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "test", "scripts"]
}
```

- [ ] **Step 4: Create `packages/shared/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 60_000, // anvil integration test needs headroom
    hookTimeout: 60_000,
  },
});
```

- [ ] **Step 5: Create the ABI generator `packages/shared/scripts/gen-abi.mjs`**

```js
// Reads forge artifacts from packages/contracts/out and emits a committed TS module
// with { abi, bytecode } for each contract, so the SDK does not depend on the
// gitignored out/ directory at runtime/test time.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../contracts/out");
const dest = resolve(here, "../src/abi.generated.ts");

const CONTRACTS = ["MockUSDC", "LiquidityPool", "InvoiceRegistry", "FactoringController"];

function load(name) {
  const json = JSON.parse(readFileSync(resolve(outDir, `${name}.sol/${name}.json`), "utf8"));
  const bytecode = json.bytecode?.object ?? json.bytecode;
  if (!json.abi || !bytecode) throw new Error(`Missing abi/bytecode for ${name}; run 'forge build' first`);
  return { abi: json.abi, bytecode };
}

const banner = "// AUTO-GENERATED by scripts/gen-abi.mjs. Do not edit by hand.\n// Regenerate after contract changes: pnpm -F @anticipo/shared gen:abi\n";
let body = banner + "\n";
for (const name of CONTRACTS) {
  const { abi, bytecode } = load(name);
  body += `export const ${name} = {\n  abi: ${JSON.stringify(abi)} as const,\n  bytecode: ${JSON.stringify(bytecode)} as \`0x\${string}\`,\n};\n\n`;
}
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, body);
console.log(`Wrote ${dest} (${CONTRACTS.join(", ")})`);
```

- [ ] **Step 6: Build contracts, install deps, generate ABIs**

Run:
```bash
cd packages/contracts && forge build && cd ../..
pnpm install
pnpm -F @anticipo/shared gen:abi
```
Expected: `forge build` succeeds; `pnpm install` links the workspace; `gen:abi` prints `Wrote .../abi.generated.ts (MockUSDC, LiquidityPool, InvoiceRegistry, FactoringController)`. Open `packages/shared/src/abi.generated.ts` and confirm it has four `export const` blocks each with a non-empty `bytecode` starting `0x`.

- [ ] **Step 7: Create the barrel `packages/shared/src/index.ts`**

```ts
export * from "./types.js";
export * from "./eip712.js";
export * from "./features.js";
export * from "./llm.js";
export * from "./pricing.js";
export * from "./sign.js";
export * from "./underwrite.js";
export * as artifacts from "./abi.generated.js";
```

Note: with NodeNext ESM, intra-package relative imports use the `.js` extension even though the source is `.ts`.

- [ ] **Step 8: Verify install + typecheck skeleton**

The barrel imports modules that don't exist yet, so don't typecheck the barrel now. Instead confirm tooling works:
Run: `pnpm -F @anticipo/shared exec vitest run --passWithNoTests`
Expected: vitest runs, finds no tests, exits 0.

- [ ] **Step 9: Commit**

```bash
git add packages/shared pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(shared): scaffold @anticipo/shared SDK + generated contract ABIs"
```

Note: temporarily reduce `src/index.ts` to `export * as artifacts from "./abi.generated.js";` before committing if the barrel's missing-module imports break tooling — restore the full barrel in the final task. (If Step 8 passed as written, leave it.)

---

## Task 2: Types + EIP-712 domain/types

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/eip712.ts`
- Test: `packages/shared/test/eip712.test.ts`

- [ ] **Step 1: Write the failing test** — `packages/shared/test/eip712.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @anticipo/shared exec vitest run test/eip712.test.ts`
Expected: FAIL — cannot resolve `../src/eip712.js` / `../src/types.js`.

- [ ] **Step 3: Implement `packages/shared/src/types.ts`**

```ts
import type { Address, Hex } from "viem";

export interface Quote {
  smb: Address;
  buyer: Address;
  faceAmount: bigint;
  dueDate: bigint;          // unix seconds (uint64 → viem infers bigint)
  advanceRatioBps: number;  // uint16
  feeBps: number;           // uint16
  advanceAmount: bigint;
  docHash: Hex;             // bytes32
  expiry: bigint;           // unix seconds (uint64 → viem infers bigint)
  nonce: bigint;
}

export interface InvoiceInput {
  smb: Address;
  buyer: Address;
  faceAmount: bigint;
  dueDate: bigint;          // unix seconds (uint64); flows into Quote.dueDate
  docHash: Hex;
}

export interface BuyerReputation {
  paidOnTime: number;
  paidLate: number;
  defaulted: number;
  totalVolumeRepaid: bigint;
  firstSeen: number;
}

export interface PoolStats {
  totalAssets: bigint;
  availableLiquidity: bigint;
  outstandingPrincipal: bigint;
  utilization: number; // outstanding / totalAssets, 0..1
}

export interface BuyerFeatures {
  buyer: Address;
  totalInvoices: number;
  onTimeRate: number | null;  // null when no history
  lateRate: number | null;
  defaultRate: number | null;
  totalVolumeRepaid: bigint;
  accountAgeDays: number;
  reputation: BuyerReputation;
  pool: PoolStats;
}

export interface UnderwritingDecision {
  riskScore: number;        // 0..100
  advanceRatioBps: number;  // <= 9500 after clamp
  feeBps: number;           // <= 2000 after clamp
  advanceAmount: bigint;    // computed, advance + fee <= face
  rationale: string;
  keyFactors: string[];
}
```

- [ ] **Step 4: Implement `packages/shared/src/eip712.ts`**

```ts
import type { Address, TypedDataDomain } from "viem";

/// Must match FactoringController's EIP712("Anticipo","1") and QUOTE_TYPEHASH field order.
export function buildQuoteDomain(chainId: number, verifyingContract: Address): TypedDataDomain {
  return { name: "Anticipo", version: "1", chainId, verifyingContract };
}

export const QUOTE_TYPES = {
  Quote: [
    { name: "smb", type: "address" },
    { name: "buyer", type: "address" },
    { name: "faceAmount", type: "uint256" },
    { name: "dueDate", type: "uint64" },
    { name: "advanceRatioBps", type: "uint16" },
    { name: "feeBps", type: "uint16" },
    { name: "advanceAmount", type: "uint256" },
    { name: "docHash", type: "bytes32" },
    { name: "expiry", type: "uint64" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const QUOTE_PRIMARY_TYPE = "Quote" as const;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm -F @anticipo/shared exec vitest run test/eip712.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/eip712.ts packages/shared/test/eip712.test.ts
git commit -m "feat(shared): Quote/feature types + EIP-712 domain matching FactoringController"
```

---

## Task 3: Deterministic pricing + clamps (mocked LLM)

**Files:**
- Create: `packages/shared/src/llm.ts` (interface + schema only in this task; OpenRouter impl in Task 4)
- Create: `packages/shared/src/pricing.ts`
- Test: `packages/shared/test/pricing.test.ts`

- [ ] **Step 1: Write the failing test** — `packages/shared/test/pricing.test.ts`:

```ts
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
  dueDate: 2_000_000_000,
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @anticipo/shared exec vitest run test/pricing.test.ts`
Expected: FAIL — cannot resolve `../src/pricing.js` / `../src/llm.js`.

- [ ] **Step 3: Implement `packages/shared/src/llm.ts`** (interface + schema + prompt; OpenRouter class added in Task 4)

```ts
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
```

- [ ] **Step 4: Implement `packages/shared/src/pricing.ts`**

```ts
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

  return {
    riskScore,
    advanceRatioBps,
    feeBps,
    advanceAmount,
    rationale: raw.rationale,
    keyFactors: raw.keyFactors,
  };
}
```

- [ ] **Step 4b: Run test to verify it passes**

Run: `pnpm -F @anticipo/shared exec vitest run test/pricing.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/llm.ts packages/shared/src/pricing.ts packages/shared/test/pricing.test.ts
git commit -m "feat(shared): deterministic pricing clamps over a mockable UnderwriterLLM"
```

---

## Task 4: OpenRouter/Gemini LLM implementation + prompt

**Files:**
- Modify: `packages/shared/src/llm.ts` (append `buildPrompt` + `OpenRouterLLM`)
- Test: `packages/shared/test/llm.test.ts`

- [ ] **Step 1: Write the failing test** — `packages/shared/test/llm.test.ts`:

```ts
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
  dueDate: 2_000_000_000,
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
    // schema + model were passed through
    expect(calls[0].model).toBe("google/gemini-2.5-flash");
    expect(calls[0].response_format.json_schema.name).toBe(DECISION_JSON_SCHEMA.name);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @anticipo/shared exec vitest run test/llm.test.ts`
Expected: FAIL — `OpenRouterLLM` / `buildPrompt` not exported.

- [ ] **Step 3: Append to `packages/shared/src/llm.ts`**

```ts
import OpenAI from "openai";
import { formatUnits } from "viem";

export function buildPrompt(features: BuyerFeatures, input: InvoiceInput): { system: string; user: string } {
  const face = formatUnits(input.faceAmount, 6);
  const r = features.reputation;
  const system =
    "You are Anticipo's invoice-factoring underwriter. Price an advance on an unpaid B2B invoice " +
    "using ONLY the buyer's verifiable on-chain payment history and the pool's liquidity. A buyer who " +
    "pays on time deserves a high advance ratio and low fee; late/defaulting buyers get a lower ratio and " +
    "higher fee. Be conservative when history is thin. Respond ONLY with the required JSON.";
  const user = [
    `Invoice face amount: ${face} USDC, due ${new Date(input.dueDate * 1000).toISOString().slice(0, 10)}.`,
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
```

Note: the `import` statements must move to the top of `llm.ts` (TypeScript requires imports at module top). Place `import OpenAI from "openai";` and `import { formatUnits } from "viem";` with the existing top imports, not mid-file.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @anticipo/shared exec vitest run test/llm.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/llm.ts packages/shared/test/llm.test.ts
git commit -m "feat(shared): OpenRouter/Gemini LLM with structured output + grounded prompt"
```

---

## Task 5: On-chain feature extraction

**Files:**
- Create: `packages/shared/src/features.ts`
- Test: `packages/shared/test/features.test.ts`

- [ ] **Step 1: Write the failing test** — `packages/shared/test/features.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @anticipo/shared exec vitest run test/features.test.ts`
Expected: FAIL — cannot resolve `../src/features.js`.

- [ ] **Step 3: Implement `packages/shared/src/features.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @anticipo/shared exec vitest run test/features.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/features.ts packages/shared/test/features.test.ts
git commit -m "feat(shared): on-chain buyer-reputation + pool feature extraction (viem)"
```

---

## Task 6: Quote builder + signer + orchestrator

**Files:**
- Create: `packages/shared/src/sign.ts`
- Create: `packages/shared/src/underwrite.ts`
- Test: `packages/shared/test/sign.test.ts`

- [ ] **Step 1: Write the failing test** — `packages/shared/test/sign.test.ts`:

```ts
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
  dueDate: 2_000_000_000,
  docHash: keccak256(toHex("invoice-xyz")),
};
const decision: UnderwritingDecision = {
  riskScore: 20, advanceRatioBps: 8000, feeBps: 200, advanceAmount: 80_000_000n, rationale: "clean", keyFactors: [],
};

describe("buildQuote / signQuote", () => {
  it("builds a Quote from input + decision with the given nonce/expiry", () => {
    const q = buildQuote(input, decision, { nonce: 5n, expiry: 2_000_003_600 });
    expect(q.smb).toBe(input.smb);
    expect(q.advanceAmount).toBe(80_000_000n);
    expect(q.advanceRatioBps).toBe(8000);
    expect(q.docHash).toBe(input.docHash);
    expect(q.nonce).toBe(5n);
  });

  it("signs a quote that recovers to the underwriter for the bound domain", async () => {
    const q = buildQuote(input, decision, { nonce: 5n, expiry: 2_000_003_600 });
    const domain = buildQuoteDomain(421614, "0x5FbDB2315678afecb367f032d93F642f64180aa3");
    const sig = await signQuote(underwriter, domain, q);
    const recovered = await recoverTypedDataAddress({ domain, types: QUOTE_TYPES, primaryType: "Quote", message: q, signature: sig });
    expect(recovered.toLowerCase()).toBe(underwriter.address.toLowerCase());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @anticipo/shared exec vitest run test/sign.test.ts`
Expected: FAIL — cannot resolve `../src/sign.js`.

- [ ] **Step 3: Implement `packages/shared/src/sign.ts`**

```ts
import type { Account, Address, Hex, TypedDataDomain } from "viem";
import { QUOTE_TYPES, QUOTE_PRIMARY_TYPE } from "./eip712.js";
import type { InvoiceInput, Quote, UnderwritingDecision } from "./types.js";

export function buildQuote(
  input: InvoiceInput,
  decision: UnderwritingDecision,
  opts: { nonce: bigint; expiry: number },
): Quote {
  return {
    smb: input.smb,
    buyer: input.buyer,
    faceAmount: input.faceAmount,
    dueDate: input.dueDate,
    advanceRatioBps: decision.advanceRatioBps,
    feeBps: decision.feeBps,
    advanceAmount: decision.advanceAmount,
    docHash: input.docHash,
    expiry: opts.expiry,
    nonce: opts.nonce,
  };
}

export async function signQuote(account: Account, domain: TypedDataDomain, quote: Quote): Promise<Hex> {
  if (!account.signTypedData) throw new Error("signQuote: account cannot sign typed data");
  return account.signTypedData({ domain, types: QUOTE_TYPES, primaryType: QUOTE_PRIMARY_TYPE, message: quote });
}
```

- [ ] **Step 4: Implement `packages/shared/src/underwrite.ts`**

```ts
import type { Account, Address, Hex, TypedDataDomain } from "viem";
import type { ContractAddresses } from "./features.js";
import { extractFeatures } from "./features.js";
import { priceWithLLM } from "./pricing.js";
import { buildQuote, signQuote } from "./sign.js";
import { buildQuoteDomain } from "./eip712.js";
import type { InvoiceInput, Quote, UnderwritingDecision } from "./types.js";
import type { UnderwriterLLM } from "./llm.js";

interface MinimalPublicClient {
  readContract(args: { address: Address; abi: readonly unknown[]; functionName: string; args?: readonly unknown[] }): Promise<any>;
}

export interface UnderwriteDeps {
  client: MinimalPublicClient;
  addrs: ContractAddresses & { controller: Address };
  chainId: number;
  llm: UnderwriterLLM;
  signer: Account;
  nonce: bigint;
  nowSec: number;
  quoteTtlSec?: number; // default 3600
}

export interface UnderwriteResult {
  decision: UnderwritingDecision;
  quote: Quote;
  signature: Hex;
}

export async function underwrite(input: InvoiceInput, deps: UnderwriteDeps): Promise<UnderwriteResult> {
  const features = await extractFeatures(deps.client, deps.addrs, { buyer: input.buyer, nowSec: deps.nowSec });
  const decision = await priceWithLLM(features, input, deps.llm);
  const quote = buildQuote(input, decision, { nonce: deps.nonce, expiry: deps.nowSec + (deps.quoteTtlSec ?? 3600) });
  const domain = buildQuoteDomain(deps.chainId, deps.addrs.controller);
  const signature = await signQuote(deps.signer, domain, quote);
  return { decision, quote, signature };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm -F @anticipo/shared exec vitest run test/sign.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck the whole package now that all modules exist**

Run: `pnpm -F @anticipo/shared typecheck`
Expected: no type errors. Fix any import/extension issues (NodeNext requires `.js` suffixes on relative imports).

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/sign.ts packages/shared/src/underwrite.ts packages/shared/test/sign.test.ts
git commit -m "feat(shared): quote builder, EIP-712 signer, and underwrite() orchestrator"
```

---

## Task 7: Anvil round-trip integration test (cross-stack EIP-712 parity)

**Files:**
- Create: `packages/shared/test/helpers/anvil.ts`
- Create: `packages/shared/test/helpers/deploy.ts`
- Create: `packages/shared/test/integration.anvil.test.ts`

This is the crown-jewel test: it deploys the real Phase 1 contracts to a local anvil, has the TS SDK sign a quote, and proves the on-chain `FactoringController.requestFinancing` accepts it — confirming the TS EIP-712 encoding matches Solidity exactly.

- [ ] **Step 1: Write the anvil lifecycle helper** — `packages/shared/test/helpers/anvil.ts`:

```ts
import { spawn, type ChildProcess } from "node:child_process";
import { createPublicClient, http } from "viem";

export interface AnvilHandle {
  rpcUrl: string;
  stop: () => void;
}

/// Spawns a local anvil node and waits until it answers eth_blockNumber.
export async function startAnvil(port = 8545): Promise<AnvilHandle> {
  const proc: ChildProcess = spawn("anvil", ["--port", String(port), "--silent"], {
    stdio: "ignore",
    shell: process.platform === "win32", // resolve anvil.cmd/exe on Windows PATH
  });
  const rpcUrl = `http://127.0.0.1:${port}`;
  const client = createPublicClient({ transport: http(rpcUrl) });

  const deadline = Date.now() + 20_000;
  for (;;) {
    try {
      await client.getBlockNumber();
      break;
    } catch {
      if (Date.now() > deadline) {
        proc.kill();
        throw new Error("anvil did not start within 20s");
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return { rpcUrl, stop: () => proc.kill() };
}
```

- [ ] **Step 2: Write the deploy helper** — `packages/shared/test/helpers/deploy.ts`:

```ts
import type { Address, PublicClient, WalletClient } from "viem";
import { MockUSDC, LiquidityPool, InvoiceRegistry, FactoringController } from "../../src/abi.generated.js";

export interface DeployedAddresses {
  usdc: Address;
  pool: Address;
  registry: Address;
  controller: Address;
}

async function deployOne(
  wallet: WalletClient,
  pub: PublicClient,
  artifact: { abi: readonly unknown[]; bytecode: `0x${string}` },
  args: readonly unknown[],
): Promise<Address> {
  const hash = await wallet.deployContract({ abi: artifact.abi as any, bytecode: artifact.bytecode, args: args as any, account: wallet.account!, chain: null });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error("deploy: no contractAddress in receipt");
  return receipt.contractAddress;
}

/// Deploys the full stack and wires the controller, mirroring Deploy.s.sol.
export async function deployStack(
  wallet: WalletClient,
  pub: PublicClient,
  underwriter: Address,
): Promise<DeployedAddresses> {
  const usdc = await deployOne(wallet, pub, MockUSDC, []);
  const pool = await deployOne(wallet, pub, LiquidityPool, [usdc]);
  const registry = await deployOne(wallet, pub, InvoiceRegistry, []);
  const controller = await deployOne(wallet, pub, FactoringController, [usdc, pool, registry, underwriter]);

  const acct = wallet.account!;
  const setPool = await wallet.writeContract({ address: pool, abi: LiquidityPool.abi as any, functionName: "setController", args: [controller], account: acct, chain: null });
  await pub.waitForTransactionReceipt({ hash: setPool });
  const setReg = await wallet.writeContract({ address: registry, abi: InvoiceRegistry.abi as any, functionName: "setController", args: [controller], account: acct, chain: null });
  await pub.waitForTransactionReceipt({ hash: setReg });

  return { usdc, pool, registry, controller };
}
```

- [ ] **Step 3: Write the integration test** — `packages/shared/test/integration.anvil.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createPublicClient, createWalletClient, http, keccak256, toHex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { startAnvil, type AnvilHandle } from "./helpers/anvil.js";
import { deployStack, type DeployedAddresses } from "./helpers/deploy.js";
import { MockUSDC, LiquidityPool, FactoringController, InvoiceRegistry } from "../src/abi.generated.js";
import { underwrite } from "../src/underwrite.js";
import type { UnderwriterLLM } from "../src/llm.js";
import type { InvoiceInput } from "../src/types.js";

// Anvil default accounts (well-known test keys — never used on a real network).
const DEPLOYER = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const UNDERWRITER = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"); // #1
const SMB = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"); // #2
const BUYER = privateKeyToAccount("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"); // #3

const fakeLLM: UnderwriterLLM = {
  price: async () => ({ riskScore: 20, advanceRatioBps: 8000, feeBps: 200, rationale: "clean payer", keyFactors: ["seeded"] }),
};

let anvil: AnvilHandle;
let pub: ReturnType<typeof createPublicClient>;
let addrs: DeployedAddresses;

const ANVIL_CHAIN_ID = 31337;

beforeAll(async () => {
  anvil = await startAnvil(8545);
  pub = createPublicClient({ transport: http(anvil.rpcUrl) });
  const deployerWallet = createWalletClient({ account: DEPLOYER, transport: http(anvil.rpcUrl) });
  addrs = await deployStack(deployerWallet, pub, UNDERWRITER.address);

  // Fund the pool: mint USDC to deployer, approve, deposit 1,000 USDC.
  const mint = await deployerWallet.writeContract({ address: addrs.usdc, abi: MockUSDC.abi as any, functionName: "mint", args: [DEPLOYER.address, 1_000_000_000n], account: DEPLOYER, chain: null });
  await pub.waitForTransactionReceipt({ hash: mint });
  const approve = await deployerWallet.writeContract({ address: addrs.usdc, abi: MockUSDC.abi as any, functionName: "approve", args: [addrs.pool, 1_000_000_000n], account: DEPLOYER, chain: null });
  await pub.waitForTransactionReceipt({ hash: approve });
  const deposit = await deployerWallet.writeContract({ address: addrs.pool, abi: LiquidityPool.abi as any, functionName: "deposit", args: [1_000_000_000n, DEPLOYER.address], account: DEPLOYER, chain: null });
  await pub.waitForTransactionReceipt({ hash: deposit });
}, 60_000);

afterAll(() => anvil?.stop());

describe("anvil round-trip: TS-signed quote accepted on-chain", () => {
  it("requestFinancing accepts the SDK's EIP-712 signature and advances USDC", async () => {
    const block = await pub.getBlock();
    const input: InvoiceInput = {
      smb: SMB.address,
      buyer: BUYER.address,
      faceAmount: 100_000_000n,
      dueDate: Number(block.timestamp) + 30 * 86_400,
      docHash: keccak256(toHex("invoice-001")),
    };
    const { quote, signature, decision } = await underwrite(input, {
      client: pub,
      addrs: { registry: addrs.registry, pool: addrs.pool, controller: addrs.controller },
      chainId: ANVIL_CHAIN_ID,
      llm: fakeLLM,
      signer: UNDERWRITER,
      nonce: 1n,
      nowSec: Number(block.timestamp),
    });
    expect(decision.advanceAmount).toBe(80_000_000n);

    const smbWallet = createWalletClient({ account: SMB, transport: http(anvil.rpcUrl) });
    const hash = await smbWallet.writeContract({
      address: addrs.controller,
      abi: FactoringController.abi as any,
      functionName: "requestFinancing",
      args: [quote, signature],
      account: SMB,
      chain: null,
    });
    const receipt = await pub.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe("success");

    const smbBal = (await pub.readContract({ address: addrs.usdc, abi: MockUSDC.abi as any, functionName: "balanceOf", args: [SMB.address] })) as bigint;
    expect(smbBal).toBe(80_000_000n); // advance received
    const outstanding = (await pub.readContract({ address: addrs.pool, abi: LiquidityPool.abi as any, functionName: "outstandingPrincipal" })) as bigint;
    expect(outstanding).toBe(80_000_000n);
    const owner = (await pub.readContract({ address: addrs.registry, abi: InvoiceRegistry.abi as any, functionName: "ownerOf", args: [1n] })) as Address;
    expect(owner.toLowerCase()).toBe(addrs.pool.toLowerCase());
  });

  it("rejects a tampered quote (signature no longer matches)", async () => {
    const block = await pub.getBlock();
    const input: InvoiceInput = {
      smb: SMB.address, buyer: BUYER.address, faceAmount: 100_000_000n,
      dueDate: Number(block.timestamp) + 30 * 86_400, docHash: keccak256(toHex("invoice-002")),
    };
    const { quote, signature } = await underwrite(input, {
      client: pub,
      addrs: { registry: addrs.registry, pool: addrs.pool, controller: addrs.controller },
      chainId: ANVIL_CHAIN_ID, llm: fakeLLM, signer: UNDERWRITER, nonce: 2n, nowSec: Number(block.timestamp),
    });
    const tampered = { ...quote, advanceAmount: 95_000_000n }; // raise advance after signing
    const smbWallet = createWalletClient({ account: SMB, transport: http(anvil.rpcUrl) });
    await expect(
      smbWallet.writeContract({ address: addrs.controller, abi: FactoringController.abi as any, functionName: "requestFinancing", args: [tampered, signature], account: SMB, chain: null }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run the integration test**

Run: `pnpm -F @anticipo/shared exec vitest run test/integration.anvil.test.ts`
Expected: PASS (2 tests). The first proves a TS-signed quote is accepted on-chain (cross-stack EIP-712 parity); the second proves tampering breaks the signature. If `anvil` isn't found, ensure Foundry is on PATH (`anvil --version`).

- [ ] **Step 5: Run the full package suite**

Run: `pnpm -F @anticipo/shared test`
Expected: all suites pass (eip712, pricing, llm, features, sign, integration).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/test/helpers packages/shared/test/integration.anvil.test.ts
git commit -m "test(shared): anvil round-trip proving TS-signed EIP-712 quote is accepted on-chain"
```

---

## Self-Review

**1. Spec coverage (§6 Off-chain AI Underwriter + §4 decisions 2 & 7):**
- §6.1 input `{faceAmount, buyer, dueDate, docHash}` → `InvoiceInput` (Task 2) ✓
- §6.2 deterministic feature extraction from on-chain reputation + pool → `extractFeatures` (Task 5) ✓
- §6.3 Gemini via OpenRouter, strict JSON schema, structured output → `OpenRouterLLM` + `DECISION_JSON_SCHEMA` (Task 4) ✓
- §6.3 returns riskScore/advanceRatioBps/feeBps/rationale/keyFactors; advanceAmount computed → `RawDecision` + `priceWithLLM` (Tasks 3-4) ✓
- §6.4 sign EIP-712 `Quote`, return quote+signature+rationale → `signQuote` + `underwrite` (Task 6) ✓
- §6 guardrails: deterministic min/max clamps → `priceWithLLM` clamps + `DECISION_JSON_SCHEMA` bounds (Task 3) ✓
- §4.2 EIP-712 attestation matching the contract → `eip712.ts` + Task 7 anvil round-trip proves parity ✓
- §4.7 Gemini not Claude, model configurable → `OPENROUTER_MODEL` env default (Task 4) ✓
- `packages/shared` deliverable (ABIs/addresses/EIP-712 types) → Tasks 1-2 ✓
- Deferred to Phase 3 (correctly out of scope): the Next.js `/api/underwrite` route wrapping `underwrite()`, the seeder script (moved to Phase 4 with live deploy). The orchestrator `underwrite()` is the route's core, ready to wrap.

**2. Placeholder scan:** No TBD/TODO/"add error handling". Every step has full code or an exact command. ✓

**3. Type consistency:** `Quote` fields/types match `eip712.ts` `QUOTE_TYPES`, `buildQuote`, and the contract's `QUOTE_TYPEHASH` (Task 7 verifies on-chain). `UnderwriterLLM.price` signature is identical in `llm.ts`, `pricing.ts`, the fakes, and `underwrite.ts`. `RawDecision` (5 fields, no advanceAmount) vs `UnderwritingDecision` (adds computed `advanceAmount`) are used consistently. `ContractAddresses` from `features.ts` is reused by `underwrite.ts` (extended with `controller`). `extractFeatures`'s `MinimalPublicClient.readContract` shape matches the stub in its test and the real viem client in Task 7. `clampInt`/`MAX_*` constants mirror the on-chain `MAX_ADVANCE_RATIO_BPS`/`MAX_FEE_BPS`. ✓

**4. Cross-stack parity risk** (the one thing that could silently break): handled by Task 7 deploying the real bytecode and asserting `requestFinancing` accepts the TS signature, plus a tamper-rejection case. The `.js` extension requirement for NodeNext relative imports is called out in Tasks 1, 6, 7.
