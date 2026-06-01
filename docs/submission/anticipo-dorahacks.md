# Anticipo — DoraHacks BUIDL submission (draft)

> **Live app:** https://anticipo-red.vercel.app · **Repo:** https://github.com/RaYYeR220/anticipo · **Video:** [VIDEO URL — record on the live app]
> Written to the ETHMexico2026 rubric: **30% code · 25% innovation · 20% LATAM impact · 15% Ethereum/L2 · 10% demo.**

> **Deployed on Arbitrum Sepolia (chain 421614):** MockUSDC `0x5F4d518FF3EeFeA5Ba55E2C365e80dB005032A81` · LiquidityPool `0x7Af6d4a94818eA00ccC7104397C5D23a2De9FFbD` · InvoiceRegistry `0x1fCd2F496A9B8F533Cc450AE494546e5dE56D918` · FactoringController `0xF7a76A45DEd795261c2Ad3F439F635492529Cd49` · Underwriter `0xCDe533a0982402D703f9262c6c2beCE502DE32c9`.

---

## Title
**Anticipo — Cobra hoy, no en 45 días**

## Tagline
AI invoice-factoring on Arbitrum: turn an unpaid B2B invoice into instant USDC, priced by an underwriter agent that reads the buyer's real on-chain payment history.

## The problem (LATAM impact — 20%)
LATAM SMBs sell on credit and wait **45–90 days** to get paid, while payroll and suppliers need cash *now*. The financing gap is filled today by informal lenders at brutal effective rates. The pain is concrete, universal across the region, and underserved — the textbook working-capital squeeze.

## What Anticipo does
1. An SMB submits an unpaid invoice issued to a buyer.
2. An **AI underwriter agent** reads the buyer's verifiable on-chain payment history (on-time / late / defaulted, volume, account age) + pool liquidity and **prices the advance**: an advance ratio (how much of face value, up to 95%) and a fee.
3. The decision is returned as an **EIP-712 quote signed by the underwriter key** — the contract verifies the signature on-chain; the AI never sends a transaction.
4. The SMB accepts → the receivable is minted as an **ERC-721**, and an **ERC-4626 liquidity pool advances USDC instantly** on Arbitrum.
5. When the buyer pays, the pool is repaid principal + fee, the SMB gets the remainder, and **LPs earn yield** (share price rises). Defaults are priced into the pool (non-recourse, socialized loss).

## Why the AI is load-bearing (innovation — 25%)
This is the differentiator vs a generic "AI payments assistant." The **same $12,000 invoice** yields materially different terms purely from the buyer's on-chain history:

| Buyer | On-chain history | AI risk | Advance | Fee |
|---|---|---|---|---|
| **Soriana** (clean) | 3 invoices, all on time (230k volume) | **10/100** | **92%** | **1.2%** |
| **Comercial Mexicana** (late) | 1 on-time + 2 late (67% lateness) | **55/100** | **70%** | **6%** |

*(Actual live numbers from the deployed app on Arbitrum Sepolia.)* The terms are driven by data, not cosmetics — pricing risk rather than a binary approve/deny. Gemini reads the real on-chain reputation and even cites it: Soriana → *"perfect 100% on-time repayment history across 230,000 USDC"*; ComMex → *"high lateness rate of 67% … warrant a conservative advance ratio and elevated fee."* (`temperature: 0` for stable, reproducible demo numbers; structured-JSON output clamped to safe on-chain bounds.)

## What's on-chain (code — 30%)
Four Solidity contracts (Foundry, 29 tests), an EIP-712 SDK (`@anticipo/shared`, 15 tests), and a Next.js frontend (8 tests). 52 tests total.
- **MockUSDC** — 6-decimal testnet USDC with an open faucet mint.
- **LiquidityPool** — ERC-4626 USDC vault; fees raise share price (yield), defaults lower it.
- **InvoiceRegistry** — ERC-721 receivable + per-buyer reputation (on-time / late / defaulted, volume).
- **FactoringController** — verifies the EIP-712 quote, mints the receivable, advances from the pool, settles on payment, writes off defaults after a grace period.

## Ethereum / L2 stack + account abstraction (15%)
Arbitrum (Sepolia for the demo) as cheap settlement; native-style USDC; EIP-712 signed quotes; ERC-4626 + ERC-721 standards; wagmi/viem frontend.

**Account abstraction is live (not just "ready"):** sign in with an **email** (Privy) → an **ERC-4337 smart wallet** is created → every action (accept financing, deposit, pay) is a **gas-sponsored userop** via a **Pimlico paymaster**. No seed phrase, no testnet ETH — verified end to end on the live app. The injected (MetaMask) path remains as an env-gated fallback.

## Demo (10%)
- **Live app:** https://anticipo-red.vercel.app
- **Video (~90s):** [VIDEO URL — record on the live app]
- **Repo:** https://github.com/RaYYeR220/anticipo
- Walk: clean buyer → high advance / low fee → accept → USDC arrives; then a risky buyer → worse terms citing the late history; then the LP view (deposit → TVL + yield) and buyer payment settling the invoice.

## Honest scope / limitations
Testnet (Arbitrum Sepolia) with MockUSDC and a demo seeder for buyer history. Real-world factoring also needs off-chain legal enforceability of the receivable — out of scope here; the demo is deliberately scoped to **on-chain-verifiable invoices and on-chain-paying buyers**, where the AI has a real signal to reason over. Default handling is on-chain and non-recourse (loss priced into the pool fee), shown in the contract.

## Team
Solo builder. Built with Claude Code.

## Tracks
Arbitrum (General + Startups) · Ethereum Mexico (General + Startups).

---

## ~90-second video script (shot list)

**0:00–0:12 — Problem (landing page).**
> "LATAM small businesses wait 45 to 90 days to get paid. Anticipo turns an unpaid invoice into cash today."
Show the landing hero, tagline "Cobra hoy, no en 45 días."

**0:12–0:40 — The load-bearing AI, clean buyer (SMB view).**
Sign in with **email** (no seed phrase) → a smart wallet is created. Enter a $12,000 invoice for **Soriana**. Hit *Get AI quote*.
> "I logged in with just an email. Our underwriter agent reads Soriana's on-chain history — three invoices, all paid on time — and prices the advance live."
Show the gauge: low risk, **92% advance, 1.2% fee**, rationale citing the on-time history. Accept → the transaction is **gas-sponsored** (no ETH needed) and USDC lands in the smart wallet.
> "No gas, no wallet pop-up — the paymaster covers it."

**0:40–1:05 — Same invoice, risky buyer (proves the AI is real).**
New quote, same $12,000, buyer **Comercial Mexicana**.
> "Same invoice, different buyer — one that's paid late. The AI prices the risk: lower advance, higher fee, and it tells you why."
Show **70% advance, 6% fee** (risk 55), rationale citing the 67% lateness. This contrast is the money shot.

**1:05–1:25 — The pool (LP view) + settlement.**
> "Liquidity providers fund the advances and earn the fees as yield."
Show TVL + share-price/yield. Then the buyer pays an invoice → it settles → pool repaid, yield ticks up.

**1:25–1:35 — Tech close.**
> "Arbitrum, EIP-712 signed quotes, an ERC-4626 pool, a Gemini underwriter, and email login with gas-sponsored smart wallets. That's Anticipo."
Card with the stack + live URL.
