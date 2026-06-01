# Anticipo — Phase 4 (Testnet Deploy + Public Demo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or execute inline. This phase is ops-heavy (deploy / config / record), not TDD — steps are concrete commands + checklists, with explicit **[USER]** markers where a human action or credential is required.

**Goal:** Take the working local app (Phases 1–3, all on `main`) live: deploy the contracts to **Arbitrum Sepolia**, seed buyer history so the AI demo is real, host the frontend on **Vercel**, and produce the **DoraHacks submission** (writeup + live URL + demo video) before **2026-06-05 18:00**.

**Architecture:** No new app code required for the core path — the frontend already reads `NEXT_PUBLIC_*` (chain id 421614 + testnet addresses) and the `/api/underwrite` route already holds server secrets. Phase 4 swaps the env from local anvil (31337) to Arbitrum Sepolia (421614), deploys + seeds on testnet, and ships. Privy email-login AA is an **optional enhancement** (Task 5), env-gated and already stubbed.

**Tech:** Foundry (deploy/seed scripts), Arbitrum Sepolia, Vercel, the existing Next.js app. Optional: Privy + Pimlico.

---

## Prerequisites — credentials the USER provides (gather during `/compact`)

- **[USER] Arbitrum Sepolia RPC URL** — e.g. `https://sepolia-rollup.arbitrum.io/rpc` (public works) or an Alchemy/Infura key for reliability.
- **[USER] A deployer private key funded with Arbitrum Sepolia ETH** — get testnet ETH from a faucet (e.g. the Alchemy / QuickNode / Arbitrum bridge faucet). ~0.1 test-ETH is plenty (deploy + seed gas + funding seed actors). This key signs the deploy + seed. It also becomes the **underwriter** (its address must equal `controller.underwriter`).
- **[USER] (optional) Arbiscan API key** — only for `forge verify-contract` source verification. Nice-to-have, not required for the demo.
- **Already have:** `OPENROUTER_API_KEY` (+ `OPENROUTER_MODEL=google/gemini-3.5-flash`).
- **[USER] (optional, Task 5) Privy app id + Pimlico API key** — only if we ship email-login + sponsored gas.
- **[USER] A Vercel account** (free tier is fine) — for hosting.

> Security: the deployer/underwriter key and `OPENROUTER_API_KEY` are **server-only** secrets. On Vercel they go in Environment Variables (not `NEXT_PUBLIC_`). Never commit them. A throwaway testnet key is fine to use here, but still treat it as a secret.

---

## Task 1: Deploy contracts to Arbitrum Sepolia

**Files:** reuse `packages/contracts/script/Deploy.s.sol` (already deploys + wires the 4 contracts and reads `DEPLOYER_PRIVATE_KEY` + `UNDERWRITER_ADDRESS`).

- [ ] **Step 1:** Create `packages/contracts/.env` (gitignored) with:
  ```
  DEPLOYER_PRIVATE_KEY=0x<funded testnet key>
  UNDERWRITER_ADDRESS=<address of that same key>   # controller.underwriter
  ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
  ```
  (Underwriter == deployer keeps it simple, mirroring the local setup. The app's `UNDERWRITER_PRIVATE_KEY` must be this same key.)
- [ ] **Step 2:** Deploy:
  ```bash
  cd packages/contracts
  forge script script/Deploy.s.sol:Deploy --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast -vv
  ```
  Capture the 4 deployed addresses from the output / `broadcast/Deploy.s.sol/421614/run-latest.json`.
- [ ] **Step 3 (optional):** Verify on Arbiscan:
  ```bash
  forge verify-contract <addr> src/MockUSDC.sol:MockUSDC --chain arbitrum-sepolia --etherscan-api-key $ARBISCAN_KEY
  # repeat for LiquidityPool, InvoiceRegistry, FactoringController (constructor args via --constructor-args)
  ```
- [ ] **Step 4:** Record the addresses — they feed Task 3's Vercel env and Task 2's seeder. NOTE: testnet addresses are NOT the deterministic anvil ones; use the real deployed values everywhere.

---

## Task 2: Seed buyer history on testnet (so the AI is demonstrably load-bearing)

The AI only differentiates buyers if they have on-chain history. `SeedLocal.s.sol` relies on anvil's 10 pre-funded accounts; on testnet those EOAs have **no ETH for gas**. Two adaptations:

- [ ] **Step 1:** Create `packages/contracts/script/SeedSepolia.s.sol` — adapted from `SeedLocal.s.sol`, but:
  - Take the already-deployed contract addresses via env (`USDC_ADDRESS`, `POOL_ADDRESS`, `REGISTRY_ADDRESS`, `CONTROLLER_ADDRESS`) instead of deploying.
  - Use a small set of **demo actor keys** (generate fresh with `cast wallet new`, or reuse anvil keys — they're just EOAs): one LP, one historical SMB, two buyers (clean "Soriana", late "Comercial Mexicana"). Put their privkeys + addresses in `.env`.
  - **Fund the actors with gas first:** as the deployer, `payable(actor).transfer(0.01 ether)` for SMB + both buyers (they each send txs: financing / paying). The LP also sends (deposit). Budget ~0.01 ETH × 4 actors.
  - Keep the volume modest to save gas: e.g. Soriana **3** invoices on-time; ComMex **1 on-time + 2 late**. (Fewer than local; enough signal.)
  - Reuse the `_financeAndRepay` / `_financeAndRepayLate` logic (sign quote with underwriter key via `controller.hashQuote` + `vm.sign`; `vm.broadcast(actorPk)` per on-chain action).
  - Mint MockUSDC to the LP (for deposit), to buyers (to pay), and leave the buyer demo addresses funded so a live viewer can also pay.
- [ ] **Step 2:** Run:
  ```bash
  forge script script/SeedSepolia.s.sol:SeedSepolia --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast -vv --slow
  ```
  (`--slow` avoids nonce races across multiple broadcasters on a real network.)
- [ ] **Step 3:** Verify with `cast`: `pool.totalAssets()`, `registry.getBuyerReputation(<Soriana>)` (paidOnTime ≥ 3), `getBuyerReputation(<ComMex>)` (paidLate ≥ 2). Update `apps/web/src/lib/buyers.ts` `knownBuyer` map to the **testnet** buyer addresses so the UI resolves names.
- [ ] **Step 4:** Sanity-check the live underwrite end to end (server-side, no browser):
  ```bash
  curl -s -X POST https://<vercel-url>/api/underwrite -H 'content-type: application/json' \
    -d '{"smb":"<smb>","buyer":"<soriana>","faceAmount":"12000","dueDateSec":<future>,"docRef":"demo"}'
  ```
  Expect a low riskScore / high advance for Soriana, higher risk / lower advance for ComMex.

---

## Task 3: Deploy the frontend to Vercel

The app is a Next.js app inside a pnpm monorepo that imports `@anticipo/shared` as TS source (handled by `transpilePackages` + the webpack `extensionAlias` in `next.config.ts`). Vercel must build from the repo root so the workspace resolves.

- [ ] **Step 1 [USER]:** Import the GitHub repo (or `vercel` CLI) into Vercel. If the repo isn't on GitHub yet, push it first (`git remote add origin … && git push -u origin main`).
- [ ] **Step 2:** Project settings:
  - **Root Directory:** `apps/web` (Vercel detects Next.js). Enable **"Include files outside the root directory"** / set the monorepo install at the repo root.
  - **Install Command:** `pnpm install --frozen-lockfile` (run at repo root — Vercel handles workspace).
  - **Build Command:** default (`next build`) — `transpilePackages` compiles `@anticipo/shared`.
  - If Vercel struggles with the workspace, set Root = repo root and Build = `pnpm -F @anticipo/web build`, Output = `apps/web/.next`.
- [ ] **Step 3:** Environment Variables (Production):
  - Public (browser): `NEXT_PUBLIC_CHAIN_ID=421614`, `NEXT_PUBLIC_RPC_URL=<Arbitrum Sepolia RPC>`, `NEXT_PUBLIC_USDC_ADDRESS`, `NEXT_PUBLIC_POOL_ADDRESS`, `NEXT_PUBLIC_REGISTRY_ADDRESS`, `NEXT_PUBLIC_CONTROLLER_ADDRESS` (the Task 1 addresses).
  - Server-only (NOT `NEXT_PUBLIC_`): `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=google/gemini-3.5-flash`, `UNDERWRITER_PRIVATE_KEY=<deployer/underwriter key>`, `RPC_URL=<Arbitrum Sepolia RPC>`.
  - Optional: `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_PIMLICO_API_KEY` (Task 5).
- [ ] **Step 4:** Deploy. Then smoke-test the live URL: landing renders; `/lp` shows the seeded TVL; `/smb` `Get AI quote` against Soriana returns terms (this hits the live route → Gemini → testnet reads). Connect a wallet (MetaMask on Arbitrum Sepolia) and walk one financing.
- [ ] **Step 5:** Note the `runtime = "nodejs"` on the route is required (it uses node crypto + secrets) — confirm Vercel runs it as a Node serverless function, not edge.

---

## Task 4: Wallet UX for the public demo

- [ ] **Step 1:** Confirm the injected-wallet path works on the live site with MetaMask set to **Arbitrum Sepolia** (chainId 421614). The `Conectar wallet` button + all write flows (accept / deposit / pay) should work for any visitor with testnet ETH + (faucet-minted) USDC.
- [ ] **Step 2:** Make the demo self-serve: the `Get test USDC` faucet (MockUSDC open `mint`) already lets a visitor fund themselves with USDC; they still need a little testnet ETH for gas (link a faucet in the UI footer or the submission notes).
- [ ] **Step 3 (optional polish):** Add a small "Network: Arbitrum Sepolia" hint + a wrong-network guard (prompt to switch) in `WalletButton`/`AppHeader`.

---

## Task 5 (OPTIONAL / stretch): Privy email-login + Pimlico sponsored gas

Delivers the "no seed phrase, no gas" story from the spec. Env-gated so the injected path remains the default.

- [ ] **Step 1 [USER]:** Provide `NEXT_PUBLIC_PRIVY_APP_ID` (privy.io dashboard, configure Arbitrum Sepolia) + `NEXT_PUBLIC_PIMLICO_API_KEY` (pimlico.io).
- [ ] **Step 2:** In `Providers.tsx`, when `NEXT_PUBLIC_PRIVY_APP_ID` is set, wrap with `PrivyProvider` + `@privy-io/wagmi`'s `WagmiProvider` (embedded wallet on email login). Verify exact APIs via context7 (`@privy-io/react-auth`, `@privy-io/wagmi`, `permissionless`) — they move fast; the wagmi v2 peer may need care (fall back to injected if it fights).
- [ ] **Step 3:** With Pimlico, route the smart-account's userops through the paymaster so the SMB/LP/buyer pay **zero gas**. Update `WalletButton` to show "Log in with email".
- [ ] **Step 4:** Verify a full email→smart-account→sponsored-financing flow on the live site. If it's flaky, keep it behind the env flag and demo the injected path — do NOT let it block submission.

---

## Task 6: Demo video + DoraHacks submission

- [ ] **Step 1:** Write a ~90-second script. Suggested beat sheet:
  1. Problem: LATAM SMB waits 30–60 days to get paid. (landing)
  2. SMB finances an invoice for a **clean** buyer → AI reads on-chain history → **high advance, low fee** → Accept → USDC arrives. (the load-bearing AI moment)
  3. Same SMB, a **risky** buyer → AI gives **worse terms** (lower advance, higher fee) citing the late-payment history. (proves the AI is real, not cosmetic)
  4. LP view: deposit USDC, watch TVL + share price (yield). Buyer view: pay the invoice → settles, LP yield ticks up.
  5. Tech: Arbitrum, EIP-712 signed quotes, ERC-4626 pool, Gemini underwriter. (1 line each)
- [ ] **Step 2 [USER]:** Record the screen walkthrough on the live Vercel URL (or local). Keep it tight; show the clean-vs-risky contrast clearly.
- [ ] **Step 3:** Write the DoraHacks BUIDL: title, tagline ("Cobra hoy, no en 45 días"), problem, how it works, what's on-chain, the AI's role, tech stack, **live URL**, **repo URL**, **video link**, team. Note the honest scope (testnet, MockUSDC, demo seeder) from the design spec's limitations section.
- [ ] **Step 4 [USER]:** Submit on DoraHacks (Anticipo as the primary BUIDL; Tanda optional 2nd) **before 2026-06-05 18:00**.

---

## Optional hardening (only if time permits, before any non-demo use)

Tracked from Phase 1: override `LiquidityPool.maxWithdraw`/`maxRedeem` to cap at `availableLiquidity` (LPs currently hit a raw ERC20 revert when withdrawing past idle cash — the UI warns but the contract is blunt); set ERC4626 `_decimalsOffset()` (inflation-attack mitigation); add zero-address guards on `setController`/`setUnderwriter`. Not required for the hackathon demo.

---

## Self-Review

- **Spec coverage:** live testnet + video demo (the chosen demo mode) → Tasks 1–3 + 6. The "AI genuinely load-bearing" requirement is demonstrated by the clean-vs-risky contrast (Task 2 seed + Task 6 script). Account-abstraction story → Task 5 (optional; injected fallback always works).
- **Risk:** the multi-actor testnet seed (Task 2) is the fiddliest part (gas funding + nonce ordering) — `--slow` + pre-funding actors mitigates. Vercel monorepo build (Task 3) is the second risk — the `transpilePackages` + `extensionAlias` already proven locally should carry over; fallback build command noted.
- **No blockers without creds:** everything is gated on the user-provided testnet key + RPC + Vercel account, all listed up top.
