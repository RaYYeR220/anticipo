# Anticipo — Phase 3 (Next.js Frontend + Account Abstraction) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. View-building tasks ALSO invoke the **frontend-design** skill for visual quality.

**Goal:** Ship `apps/web` — a Next.js app where an SMB submits an invoice and watches the AI underwriter price it live, accepts to receive instant USDC; an LP deposits/withdraws and sees pool yield; a buyer pays an invoice to settle it — all on Arbitrum, with email-login account abstraction (no seed phrase, sponsored gas).

**Architecture:** Next.js App Router. A server-only `/api/underwrite` route wraps `underwrite()` from `@anticipo/shared` (holds the OpenRouter key + the underwriter signing key, allocates nonces). The browser uses wagmi/viem for contract reads and writes; Privy provides email→embedded-wallet (+ optional Pimlico-sponsored smart accounts). Pure logic (config, formatting, contract helpers, the API route) is unit-tested with vitest; the three views are built with the frontend-design skill and verified by running the app.

**Tech Stack:** Next.js 15 (App Router, TS), React 19, Tailwind CSS v3, wagmi v2 + viem v2, @tanstack/react-query v5, @privy-io/react-auth + @privy-io/wagmi, permissionless v0.2 (Pimlico paymaster), `@anticipo/shared` (workspace). Deploy: Vercel.

---

## Context for the implementer (read once)

Phases 1–2 are on `main`. Contracts are in `packages/contracts`; the underwriter SDK is `@anticipo/shared`, exporting:
- `underwrite(input, deps)` → `{ decision, quote, signature }` — the full pipeline. `deps` = `{ client (viem public), addrs:{registry,pool,controller}, chainId, llm, signer (viem Account), nonce: bigint, nowSec: number, quoteTtlSec? }`.
- `OpenRouterLLM` (Gemini via OpenRouter), `priceWithLLM`, `extractFeatures`.
- Types: `Quote`, `InvoiceInput`, `UnderwritingDecision`, `BuyerFeatures`. EIP-712: `buildQuoteDomain`, `QUOTE_TYPES`, `QUOTE_PRIMARY_TYPE`. Contract ABIs/bytecode under `artifacts.{MockUSDC,LiquidityPool,InvoiceRegistry,FactoringController}`.
- `dueDate`/`expiry`/`nonce` are **bigint**; USDC has **6 decimals**.

The SDK does NOT manage nonces or hold keys — the `/api/underwrite` route owns: the OpenRouter API key, the underwriter private key (server env, never shipped to the browser), the deployed contract addresses, and nonce allocation (the contract's `usedNonce(uint256)` rejects replays).

Environment: Windows 11; bash via the Bash tool; Node v24; `pnpm` 9.15.0; `anvil`/`forge` 1.7.1. Monorepo root has `pnpm-workspace.yaml` (globs `packages/*`, `apps/*`). Work on a branch `feat/phase3-frontend` off `main` (controller sets this up). NodeNext is used by `@anticipo/shared`; the web app uses Next's bundler (no `.js` import suffix needed inside `apps/web`, but imports FROM `@anticipo/shared` resolve via its package exports). CRLF git warnings are expected.

**No real keys are required to build and unit-test.** For local running without paymaster/Privy keys, the app falls back to a standard injected/dev wallet and an unsponsored path; the route can run against a local anvil with a dev underwriter key. Real OpenRouter/Privy/Pimlico keys + deployed Arbitrum Sepolia addresses are supplied via env for the live demo (Phase 4).

---

## File Structure (Phase 3)

```
apps/web/
  package.json                 # @anticipo/web
  next.config.ts
  tsconfig.json
  postcss.config.mjs
  tailwind.config.ts
  vitest.config.ts             # node env for lib/api unit tests
  .env.example
  src/
    app/
      layout.tsx               # <Providers> wrapper, fonts, globals
      globals.css              # tailwind + design tokens
      page.tsx                 # landing: role picker (SMB / LP / Buyer)
      smb/page.tsx
      lp/page.tsx
      buyer/page.tsx
      api/underwrite/route.ts  # POST: wraps underwrite(); server-only
    components/
      Providers.tsx            # Privy + Wagmi + QueryClient
      WalletButton.tsx         # email login / address / logout
      smb/InvoiceForm.tsx
      smb/UnderwritingCard.tsx
      smb/SmbInvoiceList.tsx
      lp/PoolStats.tsx
      lp/LpActions.tsx
      buyer/BuyerInvoiceList.tsx
      ui/*                     # Button, Card, Stat, Field, Badge (design system)
    lib/
      env.ts                   # typed env access (client vs server split)
      config.ts                # chain, contract addresses, wagmi config
      contracts.ts             # ABIs from @anticipo/shared, read/write helpers
      format.ts                # USDC/bps/date formatting
      underwriteClient.ts      # browser fetch() wrapper for /api/underwrite
    hooks/
      usePool.ts               # pool stats (read)
      useInvoices.ts           # invoice list from events/registry (read)
      useFinance.ts            # accept quote -> requestFinancing (write)
      useLp.ts                 # deposit/withdraw (write)
      usePayInvoice.ts         # buyer pay (write)
    server/
      underwriterService.ts    # server-only: builds deps, allocates nonce, calls underwrite()
    test/
      format.test.ts
      config.test.ts
      underwriterService.test.ts
```

Split by responsibility: `lib/*` is pure/browser-safe; `server/*` is server-only (imports the underwriter key); `hooks/*` wrap wagmi; `components/*` are presentational + wired to hooks. The API route is a thin adapter over `server/underwriterService.ts` (so the logic is testable without Next's request machinery).

---

## Task 1: Scaffold `apps/web` (Next.js + Tailwind + deps)

**Files:** `apps/web/package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`.

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@anticipo/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anticipo/shared": "workspace:*",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "viem": "^2.21.0",
    "wagmi": "^2.14.0",
    "@tanstack/react-query": "^5.62.0",
    "@privy-io/react-auth": "^2.0.0",
    "@privy-io/wagmi": "^1.0.0",
    "permissionless": "^0.2.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.1.0"
  }
}
```

Note: verify the exact latest minor of `@privy-io/react-auth`/`@privy-io/wagmi`/`permissionless` at install time (these move fast) via `pnpm view <pkg> version` or context7; pin what installs cleanly. If `@privy-io/wagmi` peer-conflicts with the wagmi major, fall back to plain wagmi connectors (injected) for Task 4 and treat Privy AA as the enhancement.

- [ ] **Step 2: Create `apps/web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@anticipo/shared"],
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 3: Create `apps/web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Tailwind + PostCSS**

`apps/web/postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`apps/web/tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1020",
        paper: "#f7f8fb",
        brand: { DEFAULT: "#1f6feb", soft: "#dbe7ff" },
        good: "#1a7f4b",
        warn: "#b54708",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: `apps/web/.env.example`**

```bash
# --- server only (NEVER prefixed NEXT_PUBLIC) ---
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.5-flash
UNDERWRITER_PRIVATE_KEY=0x            # the AI underwriter signer (its address must == controller.underwriter)
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
# --- public (browser) ---
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_USDC_ADDRESS=0x
NEXT_PUBLIC_POOL_ADDRESS=0x
NEXT_PUBLIC_REGISTRY_ADDRESS=0x
NEXT_PUBLIC_CONTROLLER_ADDRESS=0x
NEXT_PUBLIC_PRIVY_APP_ID=             # optional; if empty, app uses injected-wallet fallback
NEXT_PUBLIC_PIMLICO_API_KEY=          # optional; if empty, gas is unsponsored
```

- [ ] **Step 6: `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

- [ ] **Step 7: Minimal `globals.css`, `layout.tsx`, `page.tsx` so the app boots**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
:root { color-scheme: light; }
body { @apply bg-paper text-ink antialiased; }
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Anticipo", description: "AI invoice factoring on Arbitrum" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` (placeholder; replaced/expanded in Task 9):
```tsx
export default function Home() {
  return <main className="mx-auto max-w-3xl p-10"><h1 className="text-2xl font-semibold">Anticipo</h1></main>;
}
```

- [ ] **Step 8: Install + boot check**

Run:
```bash
pnpm install
pnpm -F @anticipo/web exec next build
```
Expected: install links the workspace; `next build` completes (compiles the placeholder pages) with no errors. If `next build` is slow/flaky in this environment, instead run `pnpm -F @anticipo/web typecheck` and confirm it passes.

- [ ] **Step 9: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "chore(web): scaffold Next.js app (App Router, Tailwind, wagmi/Privy deps)"
```

---

## Task 2: `lib/format` + `lib/config` + `lib/contracts` (pure, tested)

**Files:** `src/lib/format.ts`, `src/lib/env.ts`, `src/lib/config.ts`, `src/lib/contracts.ts`; Tests `test/format.test.ts`, `test/config.test.ts`.

- [ ] **Step 1: Write failing tests** — `apps/web/test/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatUsdc, parseUsdc, formatBps, formatPct } from "../src/lib/format.js";

describe("format", () => {
  it("formats USDC (6 decimals) with thousands and 2dp", () => {
    expect(formatUsdc(1_000_000n)).toBe("1.00");
    expect(formatUsdc(1_234_560_000n)).toBe("1,234.56");
    expect(formatUsdc(0n)).toBe("0.00");
  });
  it("parses a USDC string to 6-decimal bigint", () => {
    expect(parseUsdc("100")).toBe(100_000_000n);
    expect(parseUsdc("1.5")).toBe(1_500_000n);
  });
  it("formats bps as a percent", () => {
    expect(formatBps(8000)).toBe("80%");
    expect(formatBps(150)).toBe("1.5%");
  });
  it("formats a 0..1 ratio as percent", () => {
    expect(formatPct(0.125)).toBe("12.5%");
    expect(formatPct(null)).toBe("—");
  });
});
```

`apps/web/test/config.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readPublicConfig } from "../src/lib/config.js";

describe("readPublicConfig", () => {
  it("reads addresses + chainId from a provided env map", () => {
    const cfg = readPublicConfig({
      NEXT_PUBLIC_CHAIN_ID: "421614",
      NEXT_PUBLIC_RPC_URL: "https://rpc.example",
      NEXT_PUBLIC_USDC_ADDRESS: "0x0000000000000000000000000000000000000001",
      NEXT_PUBLIC_POOL_ADDRESS: "0x0000000000000000000000000000000000000002",
      NEXT_PUBLIC_REGISTRY_ADDRESS: "0x0000000000000000000000000000000000000003",
      NEXT_PUBLIC_CONTROLLER_ADDRESS: "0x0000000000000000000000000000000000000004",
    });
    expect(cfg.chainId).toBe(421614);
    expect(cfg.addresses.controller).toBe("0x0000000000000000000000000000000000000004");
  });
  it("throws if a required address is missing", () => {
    expect(() => readPublicConfig({ NEXT_PUBLIC_CHAIN_ID: "421614" } as any)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @anticipo/web exec vitest run`
Expected: FAIL — cannot resolve `../src/lib/format.js` / `config.js`.

- [ ] **Step 3: Implement `src/lib/format.ts`**

```ts
import { formatUnits, parseUnits } from "viem";

export function formatUsdc(amount: bigint): string {
  const n = Number(formatUnits(amount, 6));
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function parseUsdc(value: string): bigint {
  return parseUnits(value as `${number}`, 6);
}
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}
export function formatPct(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}
```

- [ ] **Step 4: Implement `src/lib/env.ts`**

```ts
// Browser-safe public env access. Server-only secrets live in server/ modules.
export interface PublicEnv {
  NEXT_PUBLIC_CHAIN_ID: string;
  NEXT_PUBLIC_RPC_URL: string;
  NEXT_PUBLIC_USDC_ADDRESS: string;
  NEXT_PUBLIC_POOL_ADDRESS: string;
  NEXT_PUBLIC_REGISTRY_ADDRESS: string;
  NEXT_PUBLIC_CONTROLLER_ADDRESS: string;
  NEXT_PUBLIC_PRIVY_APP_ID?: string;
  NEXT_PUBLIC_PIMLICO_API_KEY?: string;
}
```

- [ ] **Step 5: Implement `src/lib/config.ts`**

```ts
import type { Address, Chain } from "viem";
import { defineChain } from "viem";
import { arbitrumSepolia } from "viem/chains";
import type { PublicEnv } from "./env.js";

export interface AppAddresses {
  usdc: Address;
  pool: Address;
  registry: Address;
  controller: Address;
}
export interface PublicConfig {
  chainId: number;
  rpcUrl: string;
  addresses: AppAddresses;
  chain: Chain;
}

function requireAddr(env: Partial<PublicEnv>, key: keyof PublicEnv): Address {
  const v = env[key];
  if (!v || !/^0x[0-9a-fA-F]{40}$/.test(v)) throw new Error(`config: missing/invalid ${key}`);
  return v as Address;
}

export function readPublicConfig(env: Partial<PublicEnv>): PublicConfig {
  const chainId = Number(env.NEXT_PUBLIC_CHAIN_ID);
  if (!chainId) throw new Error("config: missing NEXT_PUBLIC_CHAIN_ID");
  const rpcUrl = env.NEXT_PUBLIC_RPC_URL ?? "";
  const chain =
    chainId === arbitrumSepolia.id
      ? arbitrumSepolia
      : defineChain({ id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } });
  return {
    chainId,
    rpcUrl,
    chain,
    addresses: {
      usdc: requireAddr(env, "NEXT_PUBLIC_USDC_ADDRESS"),
      pool: requireAddr(env, "NEXT_PUBLIC_POOL_ADDRESS"),
      registry: requireAddr(env, "NEXT_PUBLIC_REGISTRY_ADDRESS"),
      controller: requireAddr(env, "NEXT_PUBLIC_CONTROLLER_ADDRESS"),
    },
  };
}

// Convenience for the browser (reads process.env.NEXT_PUBLIC_* inlined by Next at build).
export function publicConfig(): PublicConfig {
  return readPublicConfig(process.env as unknown as Partial<PublicEnv>);
}
```

- [ ] **Step 6: Implement `src/lib/contracts.ts`**

```ts
import { artifacts } from "@anticipo/shared";

export const usdcAbi = artifacts.MockUSDC.abi;
export const poolAbi = artifacts.LiquidityPool.abi;
export const registryAbi = artifacts.InvoiceRegistry.abi;
export const controllerAbi = artifacts.FactoringController.abi;
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm -F @anticipo/web exec vitest run`
Expected: PASS (format 4 + config 2 = 6 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib apps/web/test/format.test.ts apps/web/test/config.test.ts
git commit -m "feat(web): pure config/format/contracts helpers with unit tests"
```

---

## Task 3: `/api/underwrite` route + `server/underwriterService` (tested)

**Files:** `src/server/underwriterService.ts`, `src/app/api/underwrite/route.ts`; Test `test/underwriterService.test.ts`.

- [ ] **Step 1: Write the failing test** — `apps/web/test/underwriterService.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { recoverTypedDataAddress, keccak256, toHex, type Address } from "viem";
import { buildQuoteDomain, QUOTE_TYPES } from "@anticipo/shared";
import { runUnderwrite, type UnderwriteServiceConfig } from "../src/server/underwriterService.js";

const underwriter = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

// stub viem public client: reputation empty, pool has liquidity, usedNonce false
const stubClient = {
  readContract: async ({ functionName }: { functionName: string }) => {
    if (functionName === "getBuyerReputation") return { paidOnTime: 0, paidLate: 0, defaulted: 0, totalVolumeRepaid: 0n, firstSeen: 0n };
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
      { smb: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", faceAmount: "100", dueDateSec: 1_900_000_000 + 2_592_000, docRef: "invoice-001" },
      cfg,
    );
    expect(res.decision.advanceRatioBps).toBe(8000);
    expect(res.quote.faceAmount).toBe(100_000_000n);
    expect(res.quote.docHash).toBe(keccak256(toHex("invoice-001")));
    const domain = buildQuoteDomain(421614, cfg.addresses.controller);
    const recovered = await recoverTypedDataAddress({ domain, types: QUOTE_TYPES, primaryType: "Quote", message: res.quote, signature: res.signature });
    expect(recovered.toLowerCase()).toBe(underwriter.address.toLowerCase());
  });

  it("serializes bigints to strings for JSON transport", async () => {
    const res = await runUnderwrite(
      { smb: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", faceAmount: "100", dueDateSec: 1_900_000_000 + 2_592_000, docRef: "x" },
      cfg,
    );
    const json = res.toJSON();
    expect(typeof json.quote.faceAmount).toBe("string");
    expect(json.quote.faceAmount).toBe("100000000");
    expect(typeof json.signature).toBe("string");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @anticipo/web exec vitest run test/underwriterService.test.ts`
Expected: FAIL — cannot resolve `../src/server/underwriterService.js`.

- [ ] **Step 3: Implement `src/server/underwriterService.ts`**

```ts
import { keccak256, toHex, parseUnits, type Account, type Address } from "viem";
import { underwrite, type UnderwriterLLM, type Quote, type UnderwritingDecision } from "@anticipo/shared";

export interface UnderwriteRequest {
  smb: Address;
  buyer: Address;
  faceAmount: string;   // human USDC, e.g. "100"
  dueDateSec: number;   // unix seconds
  docRef: string;       // hashed into docHash
}

interface MinimalPublicClient {
  readContract(args: { address: Address; abi: readonly unknown[]; functionName: string; args?: readonly unknown[] }): Promise<any>;
}

export interface UnderwriteServiceConfig {
  client: MinimalPublicClient;
  chainId: number;
  addresses: { registry: Address; pool: Address; controller: Address };
  signer: Account;
  llm: UnderwriterLLM;
  now?: () => number; // injectable clock (default Date.now/1000)
}

export interface UnderwriteServiceResult {
  decision: UnderwritingDecision;
  quote: Quote;
  signature: `0x${string}`;
  toJSON(): {
    decision: UnderwritingDecision;
    quote: Record<string, string | number>;
    signature: string;
  };
}

// Demo-grade nonce: time-derived, then bumped until usedNonce is false. A production
// service would use a per-underwriter monotonic counter or a DB sequence.
async function allocateNonce(cfg: UnderwriteServiceConfig, controllerAbi: readonly unknown[]): Promise<bigint> {
  let nonce = BigInt(Math.floor((cfg.now?.() ?? Date.now() / 1000)) * 1000 + Math.floor(Math.random() * 1000));
  for (let i = 0; i < 5; i++) {
    const used = (await cfg.client.readContract({ address: cfg.addresses.controller, abi: controllerAbi, functionName: "usedNonce", args: [nonce] })) as boolean;
    if (!used) return nonce;
    nonce += 1n;
  }
  return nonce;
}

export async function runUnderwrite(req: UnderwriteRequest, cfg: UnderwriteServiceConfig): Promise<UnderwriteServiceResult> {
  const { artifacts } = await import("@anticipo/shared");
  const nowSec = cfg.now?.() ?? Math.floor(Date.now() / 1000);
  const nonce = await allocateNonce(cfg, artifacts.FactoringController.abi);

  const { decision, quote, signature } = await underwrite(
    {
      smb: req.smb,
      buyer: req.buyer,
      faceAmount: parseUnits(req.faceAmount as `${number}`, 6),
      dueDate: BigInt(req.dueDateSec),
      docHash: keccak256(toHex(req.docRef)),
    },
    {
      client: cfg.client,
      addrs: cfg.addresses,
      chainId: cfg.chainId,
      llm: cfg.llm,
      signer: cfg.signer,
      nonce,
      nowSec,
    },
  );

  return {
    decision,
    quote,
    signature,
    toJSON() {
      return {
        decision,
        quote: {
          smb: quote.smb,
          buyer: quote.buyer,
          faceAmount: quote.faceAmount.toString(),
          dueDate: quote.dueDate.toString(),
          advanceRatioBps: quote.advanceRatioBps,
          feeBps: quote.feeBps,
          advanceAmount: quote.advanceAmount.toString(),
          docHash: quote.docHash,
          expiry: quote.expiry.toString(),
          nonce: quote.nonce.toString(),
        },
        signature,
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @anticipo/web exec vitest run test/underwriterService.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement the route `src/app/api/underwrite/route.ts`** (thin adapter)

```ts
import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { OpenRouterLLM } from "@anticipo/shared";
import { runUnderwrite, type UnderwriteRequest } from "@/server/underwriterService";

export const runtime = "nodejs"; // needs node crypto + env secrets, not edge

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UnderwriteRequest;
    if (!body?.smb || !body?.buyer || !body?.faceAmount || !body?.dueDateSec) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    const pk = process.env.UNDERWRITER_PRIVATE_KEY as `0x${string}` | undefined;
    if (!pk) return NextResponse.json({ error: "server not configured" }, { status: 500 });

    const client = createPublicClient({ transport: http(process.env.RPC_URL) });
    const result = await runUnderwrite(body, {
      client,
      chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
      addresses: {
        registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as Address,
        pool: process.env.NEXT_PUBLIC_POOL_ADDRESS as Address,
        controller: process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS as Address,
      },
      signer: privateKeyToAccount(pk),
      llm: new OpenRouterLLM(),
    });
    return NextResponse.json(result.toJSON());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "underwrite failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Confirm build/typecheck**

Run: `pnpm -F @anticipo/web typecheck`
Expected: clean (route + service typecheck).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/server apps/web/src/app/api apps/web/test/underwriterService.test.ts
git commit -m "feat(web): /api/underwrite route over a tested underwriter service"
```

---

## Task 4: Providers (Privy + Wagmi) with injected-wallet fallback

**Files:** `src/components/Providers.tsx`, `src/components/WalletButton.tsx`, update `src/app/layout.tsx`.

> **Privy/permissionless APIs move fast — verify exact usage via context7 (`@privy-io/react-auth`, `@privy-io/wagmi`, `permissionless`) at build time.** The design below is the target; adapt call signatures to the installed versions. If Privy peer-deps fight wagmi v2, ship the injected-wallet path first (fully functional) and layer Privy on top.

- [ ] **Step 1: Implement `src/components/Providers.tsx`**

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { useMemo } from "react";
import { publicConfig } from "@/lib/config";

export function Providers({ children }: { children: React.ReactNode }) {
  const cfg = useMemo(() => publicConfig(), []);
  const wagmiConfig = useMemo(
    () =>
      createConfig({
        chains: [cfg.chain],
        connectors: [injected()],
        transports: { [cfg.chain.id]: http(cfg.rpcUrl) },
        ssr: true,
      }),
    [cfg],
  );
  const queryClient = useMemo(() => new QueryClient(), []);

  // When NEXT_PUBLIC_PRIVY_APP_ID is set, wrap with <PrivyProvider> + @privy-io/wagmi's
  // WagmiProvider for email-login embedded wallets + (with Pimlico key) sponsored smart
  // accounts. Without it, the injected connector below is the working fallback.
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
```

- [ ] **Step 2: Implement `src/components/WalletButton.tsx`**

```tsx
"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  if (isConnected && address) {
    return (
      <button onClick={() => disconnect()} className="rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }
  return (
    <button onClick={() => connect({ connector: injected() })} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
      Connect wallet
    </button>
  );
}
```

- [ ] **Step 3: Wrap the app** — update `src/app/layout.tsx` body to `<Providers>{children}</Providers>` (import from `@/components/Providers`).

- [ ] **Step 4: Verify**

Run: `pnpm -F @anticipo/web typecheck` (clean). Then `pnpm -F @anticipo/web exec next build` (or `next dev` and load `/`) — the page renders with a working Connect button (injected). Privy enhancement is wired when `NEXT_PUBLIC_PRIVY_APP_ID` is present.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/Providers.tsx apps/web/src/components/WalletButton.tsx apps/web/src/app/layout.tsx
git commit -m "feat(web): wagmi/query providers + wallet button (Privy-ready, injected fallback)"
```

---

## Task 5: Read/write hooks

**Files:** `src/hooks/usePool.ts`, `src/hooks/useInvoices.ts`, `src/hooks/useFinance.ts`, `src/hooks/useLp.ts`, `src/hooks/usePayInvoice.ts`, `src/lib/underwriteClient.ts`.

Hooks wrap wagmi's `useReadContract`/`useReadContracts`/`useWriteContract`. They are verified by running the app (Task 9), not unit-tested (they require a chain + React). Build them with exact contract function names from Phase 1.

- [ ] **Step 1: `src/hooks/usePool.ts`** — reads `totalAssets`, `availableLiquidity`, `outstandingPrincipal`, and the connected LP's `balanceOf`/`convertToAssets` for share value.

```tsx
"use client";
import { useReadContracts } from "wagmi";
import { poolAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";

export function usePool(account?: `0x${string}`) {
  const { addresses } = publicConfig();
  const pool = { address: addresses.pool, abi: poolAbi } as const;
  const { data, refetch, isLoading } = useReadContracts({
    contracts: [
      { ...pool, functionName: "totalAssets" },
      { ...pool, functionName: "availableLiquidity" },
      { ...pool, functionName: "outstandingPrincipal" },
      { ...pool, functionName: "balanceOf", args: [account ?? "0x0000000000000000000000000000000000000000"] },
    ],
    query: { refetchInterval: 5000 },
  });
  const [totalAssets, available, outstanding, shares] = (data ?? []).map((d) => (d.result as bigint) ?? 0n);
  const utilization = totalAssets > 0n ? Number(outstanding) / Number(totalAssets) : 0;
  return { totalAssets, available, outstanding, shares, utilization, refetch, isLoading };
}
```

- [ ] **Step 2: `src/hooks/useInvoices.ts`** — reads `nextId` then `getInvoice(id)` for `1..nextId-1`, filters by role (smb or buyer) via the connected address.

```tsx
"use client";
import { useReadContract, useReadContracts } from "wagmi";
import { registryAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";

export function useInvoices(filter: { smb?: `0x${string}`; buyer?: `0x${string}` }) {
  const { addresses } = publicConfig();
  const registry = { address: addresses.registry, abi: registryAbi } as const;
  const { data: nextId } = useReadContract({ ...registry, functionName: "nextId", query: { refetchInterval: 5000 } });
  const ids = nextId ? Array.from({ length: Number(nextId) - 1 }, (_, i) => BigInt(i + 1)) : [];
  const { data } = useReadContracts({
    contracts: ids.map((id) => ({ ...registry, functionName: "getInvoice", args: [id] })),
    query: { enabled: ids.length > 0, refetchInterval: 5000 },
  });
  const invoices = (data ?? [])
    .map((d, i) => ({ id: ids[i], ...(d.result as any) }))
    .filter((inv) => inv && inv.status !== 0)
    .filter((inv) =>
      (filter.smb ? inv.smb?.toLowerCase() === filter.smb.toLowerCase() : true) &&
      (filter.buyer ? inv.buyer?.toLowerCase() === filter.buyer.toLowerCase() : true),
    );
  return { invoices };
}
```

- [ ] **Step 3: `src/lib/underwriteClient.ts`** — browser fetch to the API, re-hydrating bigints from the JSON string fields.

```ts
import type { Quote } from "@anticipo/shared";

export interface UnderwriteResponse {
  decision: { riskScore: number; advanceRatioBps: number; feeBps: number; advanceAmount: bigint; rationale: string; keyFactors: string[] };
  quote: Quote;
  signature: `0x${string}`;
}

export async function requestUnderwrite(input: {
  smb: `0x${string}`; buyer: `0x${string}`; faceAmount: string; dueDateSec: number; docRef: string;
}): Promise<UnderwriteResponse> {
  const res = await fetch("/api/underwrite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "underwrite failed");
  const j = await res.json();
  const q = j.quote;
  const quote: Quote = {
    smb: q.smb, buyer: q.buyer, faceAmount: BigInt(q.faceAmount), dueDate: BigInt(q.dueDate),
    advanceRatioBps: q.advanceRatioBps, feeBps: q.feeBps, advanceAmount: BigInt(q.advanceAmount),
    docHash: q.docHash, expiry: BigInt(q.expiry), nonce: BigInt(q.nonce),
  };
  return { decision: { ...j.decision, advanceAmount: BigInt(j.decision.advanceAmount) }, quote, signature: j.signature };
}
```

- [ ] **Step 4: `src/hooks/useFinance.ts`** (accept → `requestFinancing`), `src/hooks/useLp.ts` (approve+`deposit`, `redeem`), `src/hooks/usePayInvoice.ts` (approve+`payInvoice`) — each wraps `useWriteContract` + `useWaitForTransactionReceipt`. Example `useFinance.ts`:

```tsx
"use client";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { controllerAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";
import type { Quote } from "@anticipo/shared";

export function useFinance() {
  const { addresses } = publicConfig();
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });
  async function accept(quote: Quote, signature: `0x${string}`) {
    return writeContractAsync({ address: addresses.controller, abi: controllerAbi, functionName: "requestFinancing", args: [quote, signature] });
  }
  return { accept, hash, isPending, isMining, isSuccess };
}
```

(LP and buyer hooks follow the same shape: an ERC-20 `approve` to the controller/pool, then the action. Implement `useLp.deposit(amount)`, `useLp.redeem(shares)`, and `usePayInvoice.pay(id, faceAmount)` analogously, reading `usdcAbi`/`poolAbi`/`controllerAbi`.)

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm -F @anticipo/web typecheck` (clean).
```bash
git add apps/web/src/hooks apps/web/src/lib/underwriteClient.ts
git commit -m "feat(web): wagmi read/write hooks + underwrite fetch client"
```

---

## Task 6: SMB view (the hero flow) — uses frontend-design skill

**Files:** `src/app/smb/page.tsx`, `src/components/smb/InvoiceForm.tsx`, `src/components/smb/UnderwritingCard.tsx`, `src/components/smb/SmbInvoiceList.tsx`, `src/components/ui/*`.

**Invoke the `frontend-design` skill for this task** — this is the demo's centerpiece and must look production-grade, not generic-AI.

- [ ] **Step 1:** Use the frontend-design skill to design a distinctive layout for the SMB flow. Required content/behavior (the load-bearing spec):
  - **InvoiceForm:** fields buyer address, face amount (USDC), due date, an invoice reference/description (hashed to `docHash`). Submit → calls `requestUnderwrite()`.
  - **UnderwritingCard:** shows a live state (loading → result). On result, prominently display: risk score, advance ratio (`formatBps`), fee (`formatBps`), the **advance amount in USDC** the SMB receives now, the AI **rationale**, and **keyFactors** chips. An "Accept & get USDC" button calls `useFinance().accept(quote, signature)`; show mining → success with an Arbiscan tx link.
  - **SmbInvoiceList:** the connected SMB's invoices (`useInvoices({ smb: address })`) with status badges (Financed/Repaid/Defaulted) and amounts.
  - Must visibly demonstrate the load-bearing AI: a clean buyer vs a risky buyer produce different ratio/fee/rationale. (The seeded buyers come in Phase 4.)
- [ ] **Step 2:** Build the components + page with the design. Use `WalletButton` in a header. Empty/loading/error states handled.
- [ ] **Step 3: Verify by running** — start the app (`pnpm -F @anticipo/web dev`) against a local anvil with seeded contracts (or the Phase 4 testnet addresses), connect a wallet, submit an invoice, confirm the underwriting card renders the decision and the accept flow advances USDC. Capture a screenshot (Playwright or the `run`/`verify` skill).
- [ ] **Step 4: Commit** `git commit -m "feat(web): SMB invoice → AI underwriting → accept advance flow"`

---

## Task 7: LP view — uses frontend-design skill

**Files:** `src/app/lp/page.tsx`, `src/components/lp/PoolStats.tsx`, `src/components/lp/LpActions.tsx`.

- [ ] **Step 1:** Use the frontend-design skill. Required content:
  - **PoolStats:** TVL (`totalAssets`), available liquidity, utilization (%), outstanding principal, and the connected LP's position (shares → `convertToAssets` value). Live-refreshing.
  - **LpActions:** deposit USDC (approve + `deposit`) and withdraw (`redeem` shares) with amount inputs, pending/mining/success states, and an Arbiscan link. Surface the "withdraw may exceed idle liquidity" case gracefully (the pool's known limitation) — disable/clamp to `available`.
- [ ] **Step 2:** Build it.
- [ ] **Step 3: Verify by running** — deposit, see TVL rise; after a settled invoice, see share value tick up (yield). Screenshot.
- [ ] **Step 4: Commit** `git commit -m "feat(web): LP deposit/withdraw + live pool stats"`

---

## Task 8: Buyer view — uses frontend-design skill

**Files:** `src/app/buyer/page.tsx`, `src/components/buyer/BuyerInvoiceList.tsx`.

- [ ] **Step 1:** Use the frontend-design skill. Required content:
  - **BuyerInvoiceList:** invoices owed by the connected buyer (`useInvoices({ buyer: address })`), each with face amount, due date, status; a "Pay invoice" button (approve USDC to controller + `payInvoice(id)`), pending/success states, Arbiscan link. After payment, the invoice flips to Repaid and the SMB receives the remainder.
- [ ] **Step 2:** Build it.
- [ ] **Step 3: Verify by running** — pay a financed invoice; confirm settlement (status Repaid, pool repaid + fee). Screenshot.
- [ ] **Step 4: Commit** `git commit -m "feat(web): buyer pay-invoice settlement flow"`

---

## Task 9: Landing page, polish, end-to-end run

**Files:** `src/app/page.tsx`, shared `ui/*`, header/nav.

- [ ] **Step 1:** Use the frontend-design skill for a landing page that states the pitch (turn an unpaid invoice into instant USDC; AI-priced; on Arbitrum) and routes to SMB / LP / Buyer. Cohesive design system across all views (typography, color, spacing, the `ui/*` primitives).
- [ ] **Step 2:** Add a header with nav + `WalletButton` shared across pages.
- [ ] **Step 3: Full typecheck + build**

Run: `pnpm -F @anticipo/web typecheck && pnpm -F @anticipo/web exec next build`
Expected: both clean.

- [ ] **Step 4: End-to-end run** — against a local anvil with the full stack deployed + a buyer seeded with history (reuse Phase 2's anvil/deploy helpers or the Phase 4 seeder): walk the whole demo (LP deposits → SMB finances clean buyer (high ratio) and risky buyer (low ratio) → buyer pays → LP yield up). Confirm each view reflects on-chain state. Capture screenshots of all three views.

- [ ] **Step 5: Commit** `git commit -m "feat(web): landing page + shared nav + design-system polish"`

---

## Self-Review

**1. Spec coverage (§7 Frontend + §8 web + §4.4 AA):**
- SMB view (submit → live underwriting → accept → USDC) → Task 6 ✓
- LP view (deposit/withdraw, TVL/utilization/APY/share price) → Task 7 ✓
- Buyer view (pay invoice) → Task 8 ✓
- `/api/underwrite` wrapping `underwrite()` (server holds keys + nonce) → Task 3 ✓
- Privy email→smart account + Pimlico sponsored gas → Task 4 (with injected fallback so the app always works) ✓
- wagmi/viem + Tailwind + Next.js App Router → Tasks 1,4,5 ✓
- Landing + cohesive design → Task 9 ✓

**2. Placeholder scan:** The testable core (Tasks 2–3) has complete code + tests. View tasks (6–9) intentionally delegate visual implementation to the `frontend-design` skill with explicit, load-bearing content/behavior specs + run-based verification — this is the right tool for UI, not pinned JSX. No "TBD"; each view task lists exact data sources, contract calls, and acceptance criteria.

**3. Type consistency:** Contract function names (`totalAssets`, `availableLiquidity`, `outstandingPrincipal`, `balanceOf`, `convertToAssets`, `nextId`, `getInvoice`, `requestFinancing`, `deposit`, `redeem`, `payInvoice`, `usedNonce`, `getBuyerReputation`) match Phase 1 contracts. `Quote`/`UnderwritingDecision` come from `@anticipo/shared`; bigint serialization is handled at the API boundary (`toJSON` stringifies, `underwriteClient` re-hydrates). `readPublicConfig`/`AppAddresses`/`PublicConfig` are consistent across config, hooks, providers, and the route.

**4. Integration risk:** The fast-moving Privy/permissionless SDK is isolated to Task 4 with a fully-working injected-wallet fallback, so the app is demoable even if AA wiring needs iteration. The EIP-712 parity (highest risk) was already proven in Phase 2 and is reused verbatim via `@anticipo/shared`.
