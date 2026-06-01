# Anticipo — DoraHacks BUIDL submission (draft)

> Fill the **[LIVE URL]**, **[VIDEO URL]**, **[REPO URL]** placeholders once Phase 4 Tasks 1–3 + 6 land.
> Written to the ETHMexico2026 rubric: **30% code · 25% innovation · 20% LATAM impact · 15% Ethereum/L2 · 10% demo.**

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
| **Soriana** (clean) | 3 invoices, all paid on time | low | **~95%** | **~1%** |
| **Comercial Mexicana** (late) | 1 on-time + 2 late | higher | **~70%** | **~8.5%** |

The terms are driven by data, not cosmetics — pricing risk rather than a binary approve/deny. (Gemini via OpenRouter, `temperature: 0` for stable, reproducible demo numbers; structured-JSON output clamped to safe on-chain bounds.)

## What's on-chain (code — 30%)
Four Solidity contracts (Foundry, 29 tests), an EIP-712 SDK (`@anticipo/shared`, 15 tests), and a Next.js frontend (8 tests). 52 tests total.
- **MockUSDC** — 6-decimal testnet USDC with an open faucet mint.
- **LiquidityPool** — ERC-4626 USDC vault; fees raise share price (yield), defaults lower it.
- **InvoiceRegistry** — ERC-721 receivable + per-buyer reputation (on-time / late / defaulted, volume).
- **FactoringController** — verifies the EIP-712 quote, mints the receivable, advances from the pool, settles on payment, writes off defaults after a grace period.

## Ethereum / L2 stack (15%)
Arbitrum (Sepolia for the demo) as cheap settlement; native-style USDC; EIP-712 signed quotes; ERC-4626 + ERC-721 standards; wagmi/viem frontend. Account-abstraction-ready (Privy email-login + Pimlico sponsored gas is env-gated; injected wallet is the working default).

## Demo (10%)
- **Live app:** [LIVE URL]
- **Video (~90s):** [VIDEO URL]
- **Repo:** [REPO URL]
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
Enter a $12,000 invoice for **Soriana**. Hit *Get AI quote*.
> "Our underwriter agent reads Soriana's on-chain history — three invoices, all paid on time — and prices the advance live."
Show the gauge: low risk, **~95% advance, ~1% fee**, rationale citing the on-time history. Accept → USDC lands in the wallet.

**0:40–1:05 — Same invoice, risky buyer (proves the AI is real).**
New quote, same $12,000, buyer **Comercial Mexicana**.
> "Same invoice, different buyer — one that's paid late. The AI prices the risk: lower advance, higher fee, and it tells you why."
Show **~70% advance, ~8.5% fee**, rationale citing the late payments. This contrast is the money shot.

**1:05–1:25 — The pool (LP view) + settlement.**
> "Liquidity providers fund the advances and earn the fees as yield."
Show TVL + share-price/yield. Then the buyer pays an invoice → it settles → pool repaid, yield ticks up.

**1:25–1:35 — Tech close.**
> "Arbitrum, EIP-712 signed quotes, an ERC-4626 pool, and a Gemini underwriter. That's Anticipo."
Card with the stack + live URL.
