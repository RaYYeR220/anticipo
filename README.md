# Anticipo — *Cobra hoy, no en 45 días*

**AI invoice-factoring on Arbitrum.** A Latin-American small business turns an unpaid B2B invoice into instant USDC; an AI underwriter prices the advance from the buyer's real on-chain payment history; a smart contract tokenizes the receivable and an ERC-4626 liquidity pool funds it — today, not in 45 days.

- **Live app:** https://anticipo-red.vercel.app
- **Network:** Arbitrum Sepolia (chain `421614`)
- **Demo video:** https://youtu.be/ktx-p0CrDwY

Built for **ETHMexico 2026** (with Bitso).

---

## The problem

LATAM SMBs sell on credit and wait **45–90 days** to get paid, while payroll and suppliers need cash now. The gap is filled by informal lenders at brutal rates. Anticipo closes it on-chain.

## How it works

1. **Submit** an unpaid invoice and the buyer who owes you.
2. **AI prices it** — an underwriter agent reads the buyer's verifiable on-chain payment history (on-time / late / defaulted, volume, account age) and returns an advance ratio + fee as an **EIP-712 quote, signed by the underwriter key**. The contract verifies the signature on-chain; the AI never sends a transaction.
3. **Get USDC now** — accept the quote → the receivable is minted as an ERC-721 and an **ERC-4626 pool advances USDC** instantly.
4. **Settle** — when the buyer pays, the pool is repaid principal + fee, the SMB gets the remainder, and **liquidity providers earn the spread** as yield. Defaults are priced into the pool (non-recourse).

## The AI underwriter is load-bearing

The **same $12,000 invoice** gets materially different terms purely from the buyer's on-chain history — pricing risk, not a binary approve/deny:

| Buyer | On-chain history | AI risk | Advance | Fee |
|---|---|---|---|---|
| **Soriana** (clean) | 3 invoices, all on time (230k volume) | 10 / 100 | **92%** | **1.2%** |
| **Comercial Mexicana** (late) | 1 on-time + 2 late (67% lateness) | 55 / 100 | **70%** | **6%** |

*(Live figures from the deployed app.)* The model (Gemini via OpenRouter, `temperature: 0` for reproducible terms) even cites the data — Soriana: *"perfect 100% on-time repayment history across 230,000 USDC"*; ComMex: *"high lateness rate of 67% … warrant a conservative advance ratio and elevated fee."* Its numeric outputs are clamped to safe on-chain bounds before signing.

## Account abstraction — no seed phrase, no gas

Sign in with an **email** (Privy) → an **ERC-4337 smart wallet** is created → every action (accept financing, deposit, pay) is sent as a **gas-sponsored userop** via a **Pimlico paymaster**. No wallet extension, no testnet ETH. The injected (MetaMask) path remains as an env-gated fallback.

## On-chain architecture

Four Solidity contracts (Foundry, 29 tests), deployed + seeded on **Arbitrum Sepolia**:

| Contract | Role | Address |
|---|---|---|
| `MockUSDC` | 6-decimal testnet USDC with an open faucet | [`0x5F4d518FF3EeFeA5Ba55E2C365e80dB005032A81`](https://sepolia.arbiscan.io/address/0x5F4d518FF3EeFeA5Ba55E2C365e80dB005032A81) |
| `LiquidityPool` | ERC-4626 USDC vault (fees raise share price, defaults lower it) | [`0x7Af6d4a94818eA00ccC7104397C5D23a2De9FFbD`](https://sepolia.arbiscan.io/address/0x7Af6d4a94818eA00ccC7104397C5D23a2De9FFbD) |
| `InvoiceRegistry` | ERC-721 receivable + per-buyer reputation | [`0x1fCd2F496A9B8F533Cc450AE494546e5dE56D918`](https://sepolia.arbiscan.io/address/0x1fCd2F496A9B8F533Cc450AE494546e5dE56D918) |
| `FactoringController` | Verifies the EIP-712 quote, advances, settles, writes off defaults | [`0xF7a76A45DEd795261c2Ad3F439F635492529Cd49`](https://sepolia.arbiscan.io/address/0xF7a76A45DEd795261c2Ad3F439F635492529Cd49) |

## Tech stack

- **Contracts:** Solidity 0.8.24, Foundry, OpenZeppelin v5 (ERC-4626, ERC-721, EIP-712).
- **Underwriter SDK** (`@anticipo/shared`): on-chain feature extraction → Gemini (OpenRouter) → clamps → EIP-712 sign. Mockable for offline tests.
- **Frontend:** Next.js 15 (App Router) + React 19, wagmi v2 / viem v2, Tailwind. Account abstraction via Privy + Pimlico.
- **Chain:** Arbitrum Sepolia. **Hosting:** Vercel.

## Monorepo layout

```
packages/contracts   Foundry contracts, deploy + seed scripts (29 tests)
packages/shared      @anticipo/shared — underwriter SDK + EIP-712 signer (15 tests)
apps/web             Next.js frontend (8 tests)
```

## Run locally

```bash
corepack enable && pnpm install          # pnpm 9.15

# Contracts
cd packages/contracts && forge test       # 29 tests

# SDK
pnpm -F @anticipo/shared test             # 15 tests

# Frontend (needs apps/web/.env.local — see apps/web/.env.example)
pnpm -F @anticipo/web dev                 # http://localhost:3000
```

For a fully local demo, run `anvil`, deploy + seed with `packages/contracts/script/SeedLocal.s.sol`, and point `.env.local` at chain `31337`.

## Honest scope

Testnet (Arbitrum Sepolia) with MockUSDC and a demo seeder for buyer history. Real-world factoring also needs off-chain legal enforceability of the receivable — out of scope here; the demo is deliberately scoped to **on-chain-verifiable invoices and on-chain-paying buyers**, where the AI has a real signal to reason over. Default handling is on-chain and non-recourse (loss priced into the pool fee).

---

*Anticipo · ETHMexico 2026 · Cobra hoy, no en 45 días.*
