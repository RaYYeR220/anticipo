# Anticipo — Design Spec

**Status:** Approved 2026-05-29 (brainstorming → ready for writing-plans)
**Hackathon:** Ethereum Mexico 2026 — AI × Blockchain (w/ Bitso). Submit by **2026-06-05 18:00**.
**Concept source:** `BRIEF.md` (concept CONFIRMED). This doc turns the concept into a buildable MVP spec.

---

## 1. Problem & one-liner

LATAM SMBs sell on credit and wait 60–90 days to get paid while payroll and suppliers need cash now. Informal bridge credit is brutally priced. **Anticipo turns an unpaid invoice into instant USDC**: an AI underwriter prices the advance from the buyer's verifiable on-chain payment history, a smart contract tokenizes the receivable, and an on-chain liquidity pool advances ~70–95% in USDC on Arbitrum. When the buyer pays, the pool is repaid + fee, the SMB gets the remainder, and liquidity providers earn yield.

**The AI is load-bearing**: it is the underwriter. A clean payer gets a high advance ratio and low fee; a spotty payer gets a lower ratio and higher fee. That difference is the product.

## 2. Goals / Non-goals

**Goals (MVP, must ship):**
- Full working vertical slice deployed live on **Arbitrum Sepolia** with verifiable addresses.
- Real LP economics (ERC-4626 vault), real receivable token (ERC-721), real escrow/settlement, real default write-down.
- AI underwriter grounded in **real on-chain signals**, with its decision cryptographically posted on-chain (EIP-712 attestation).
- Invisible UX for the SMB via account abstraction (email login, sponsored gas).
- Polished Next.js frontend (SMB, LP, Buyer views). 1–3 min demo video + live URL.

**Non-goals (explicit, for honesty):**
- No claim of off-chain legal enforceability of the receivable. Demo is scoped to on-chain-verifiable invoices and on-chain-paying buyers.
- No real fiat on/off-ramp and **no Bitso integration** (Bitso prizes are credits, not cash — dropped as a dependency per brief). Fiat ramp is a narrated, pluggable adapter only.
- No mainnet deployment, no real KYC, no production-grade liquidation auctions.

## 3. Judging alignment (why this scope)

| Criterion | Weight | How this design scores |
|---|---|---|
| Code | 30% | ERC-4626 pool + ERC-721 receivable + EIP-712 controller + escrow/settlement + default write-down + AI service + frontend = substantial, real. |
| Innovation | 25% | Autonomous AI underwriter whose decision is a verifiable on-chain signed attestation; dynamic advance/fee pricing from on-chain history. |
| Real-world impact (LATAM) | 20% | The SMB working-capital gap is concrete and painful; honest framing of what's solved. |
| Ethereum/L2 stack | 15% | Arbitrum settlement, native-USDC model, ERC-4626/721 standards, ERC-4337 account abstraction + sponsored gas. |
| Demo | 10% | Crisp: invoice → AI prices → instant advance → buyer pays → pool repaid; plus a higher-risk invoice priced worse, and a default writing down LP value. |

## 4. Key design decisions

1. **Receivable = ERC-721 invoice NFT.** Each financed invoice is minted as an NFT collateral held by the pool. Standard, visual, judge-friendly.
2. **Underwriter trust model = EIP-712 signed attestation, not a privileged tx sender.** The AI agent signs `UnderwritingQuote{invoiceHash, buyer, faceAmount, advanceRatioBps, feeBps, maxAdvance, expiry, nonce}` with a registered underwriter key. The SMB submits the quote + signature; the controller verifies it on-chain. The AI's decision becomes cryptographically on-chain and verifiable; the agent never sends transactions.
3. **Pool = ERC-4626 vault.** LPs deposit USDC, receive shares; factoring fees raise share price = yield. Real deposit/withdraw, utilization, APY.
4. **Account abstraction = Privy (email → embedded smart account) + Pimlico paymaster** on Arbitrum Sepolia. SMB never sees a seed phrase or gas.
5. **USDC = MockUSDC (6 decimals) we control**, faucet-mintable for reliable demo seeding. Token address is a config var; narrate that production uses Circle native USDC.
6. **AI signal source = our own InvoiceRegistry history.** We seed buyer profiles (a clean payer; a risky payer with late payments + a default). The agent reads real on-chain settlement/default events — a genuine, verifiable signal.
7. **LLM = Gemini via OpenRouter** (OpenAI-compatible API), not Claude. Cheaper/faster, structured output supported. The hackathon "claude" tag refers to the build tool (we build with Claude Code); the in-product model is free choice and does not affect the rubric.
8. **Default model = non-recourse, loss socialized to the pool.** After `dueDate + grace`, anyone can call `markDefaulted`; principal is written off, pool share price drops, SMB reputation is recorded. Honest and demonstrable.

## 5. On-chain components (Solidity + Foundry + OpenZeppelin)

- **`MockUSDC`** — ERC-20, 6 decimals, open `mint` for faucet/seeding.
- **`LiquidityPool` (ERC-4626)** — vault over USDC. `deposit/mint/withdraw/redeem`. `totalAssets() = idleUSDC + outstandingPrincipal`. Only the `FactoringController` may pull advances and receive repayments. Tracks `outstandingPrincipal` and realizes losses on default.
- **`InvoiceRegistry` (ERC-721)** — mints one NFT per financed invoice. Stores `Invoice { smb, buyer, faceAmount, dueDate, advanceRatioBps, feeBps, advanceAmount, status, docHash }`. Status enum: `Financed → Repaid | Defaulted`. Also stores per-address history counters (paid on time, paid late, defaulted) updated on settlement, used as the AI signal and for reputation.
- **`FactoringController`** — orchestrator + EIP-712 verifier.
  - `requestFinancing(InvoiceInput, UnderwritingQuote, signature)`: verify quote signer == registered underwriter, quote not expired, nonce unused, hash matches invoice → mint receivable NFT (held by pool) → `pool.advance(smb, advanceAmount)` → status Financed.
  - holds `UNDERWRITER` key registry + nonce tracking.
- **`Escrow` / settlement** (can live in the controller): `payInvoice(invoiceId)` pulls `faceAmount` USDC from buyer → repays pool `advance + fee` (fee → pool yield), transfers remainder (`face − advance − fee`) to SMB, marks Repaid, updates buyer/SMB history.
- **Default:** `markDefaulted(invoiceId)` callable after `dueDate + grace` if unpaid → `pool.realizeLoss(advance)` (share price drops), mark Defaulted, record buyer default + SMB reputation hit.

**Access control:** OpenZeppelin `AccessControl`. Roles: `DEFAULT_ADMIN`, `CONTROLLER` (on pool), `UNDERWRITER` (key whose EIP-712 signatures the controller accepts).

## 6. Off-chain components

- **AI Underwriter** — Next.js route `POST /api/underwrite` (server-side; holds OpenRouter key + underwriter signing key).
  1. Input: `{ faceAmount, buyer, dueDate, docHash }`.
  2. **Deterministic feature extraction** (viem reads from `InvoiceRegistry`): buyer's count of invoices, % paid on time, average delay days, defaults, total volume, first-seen age; SMB's prior repayment track record; pool utilization/available liquidity.
  3. **Gemini (via OpenRouter)** with a strict JSON schema (structured output) returns `{ riskScore 0–100, advanceRatioBps, feeBps, maxAdvance, rationale, keyFactors[] }`. Features are passed as structured context; the model explains and prices.
  4. Server signs the EIP-712 `Quote` with the underwriter key and returns quote + signature + rationale to the frontend.
  - Guardrails: deterministic min/max clamps on ratio/fee so a model hiccup can't produce an absurd quote; the rationale must cite the supplied features.

> **Canonical EIP-712 interface (source of truth = the deployed `FactoringController`, not this prose).** Phase 2's off-chain signer MUST match the contract exactly, verified against `FactoringController.hashQuote(q)`:
> - Domain: `EIP712("Anticipo", "1")`, bound to `chainId` + the controller address.
> - Struct (field order is load-bearing): `Quote(address smb,address buyer,uint256 faceAmount,uint64 dueDate,uint16 advanceRatioBps,uint16 feeBps,uint256 advanceAmount,bytes32 docHash,uint64 expiry,uint256 nonce)`.
> - The signer computes `advanceAmount` itself (= `faceAmount * advanceRatioBps / 10000`, capped); there is no separate `maxAdvance` on-chain field. `nonce` must be globally unique per quote (monotonic counter or UUID-derived); `usedNonce(nonce)` rejects replay. Term clamps enforced on-chain: `advanceRatioBps ≤ 9500`, `feeBps ≤ 2000`, `advanceAmount + fee ≤ faceAmount`.
> - Reputation read for features: `getBuyerReputation(address)` → `{paidOnTime, paidLate, defaulted, totalVolumeRepaid, firstSeen}`. Invoice read: `getInvoice(id)` (check `status != None`). Pool stats: `totalAssets()`, `availableLiquidity()`, `outstandingPrincipal()`, `convertToAssets()`. No on-chain enumeration of an address's invoices — reconstruct from `InvoiceMinted`/`Settled`/`Defaulted` events (all indexed by `id`).
- **Seeder** — TS (viem) + Foundry script: deploy stack, mint MockUSDC, fund pool from an LP account, create 2–3 buyer profiles by running real historical settlements/defaults through the contracts so the AI reads genuine on-chain history.

## 7. Frontend (Next.js App Router + wagmi/viem + Tailwind + Privy)

- **SMB view:** submit invoice (face amount, buyer, due date, doc) → live underwriting card (risk score, advance ratio, fee, rationale, key factors) → accept → receive USDC. Dashboard of own invoices and statuses.
- **LP view:** deposit/withdraw USDC; pool stats (TVL, utilization, APY, outstanding, share price).
- **Buyer view (demo):** list of invoices owed → "pay invoice" → settlement.
- AA: Privy email login → embedded smart account; Pimlico paymaster sponsors gas. No seed phrase, no gas prompts for the SMB.

## 8. Tech stack & monorepo

- **Monorepo:** pnpm workspaces.
  - `packages/contracts` — Foundry (Solidity, OpenZeppelin), deploy scripts → Arbitrum Sepolia.
  - `apps/web` — Next.js (App Router, TS) incl. `/api/underwrite` (the AI agent), Privy + Pimlico, wagmi/viem, Tailwind. Deploy → Vercel.
  - `packages/shared` — ABIs, addresses, shared TS types, EIP-712 domain/types.
- **AI:** OpenRouter (OpenAI-compatible SDK) targeting a Gemini model; structured JSON output.
- **Chain:** Arbitrum Sepolia. RPC via public/Alchemy. Contracts verified on Arbiscan.

## 9. Data flow

**Happy path:** LP deposits USDC → SMB logs in (email → smart account, gas sponsored) → submits invoice → agent reads buyer on-chain history → Gemini prices → signed quote → SMB accepts → controller verifies signature, mints receivable NFT, pool advances USDC to SMB → later buyer pays escrow → pool recovers advance + fee (share price ↑), SMB gets remainder, NFT → Repaid.

**Default branch:** buyer doesn't pay by `dueDate + grace` → `markDefaulted` → pool realizes loss (share price ↓), buyer default + SMB reputation recorded → AI prices future deals worse.

## 10. Demo plan

Pre-seeded pool + two buyers (clean: 6 on-time payments; risky: 2 late + 1 default).
1. Show pool dashboard (TVL, APY).
2. Invoice vs clean buyer → AI: high score, ~92% advance, ~1.5% fee, rationale cites on-time history → accept → instant USDC.
3. Invoice vs risky buyer → AI: lower score, ~70% advance, ~6% fee, rationale cites late + default → **proves AI is load-bearing.**
4. Buyer pays clean invoice → pool repaid + fee, share price ↑, SMB gets remainder.
5. Risky invoice unpaid → `markDefaulted` → share price ↓.
All transactions link to Arbiscan (Sepolia). 1–3 min video + live URL.

## 11. Honesty / scope limitations (stated in README + video)

- Demo is scoped to on-chain-verifiable invoices and on-chain-paying buyers. No off-chain legal recourse is claimed.
- Default model is non-recourse with loss socialized to the pool; this is shown, not hidden.
- USDC is a mock token on testnet; production would use Circle native USDC. Fiat ramp is a narrated pluggable adapter, not implemented.

## 12. Risks & mitigations

- **AI must be genuinely load-bearing** → grounded in real seeded on-chain history; two contrasting invoices in the demo prove pricing reacts to signal. Deterministic clamps prevent nonsense quotes.
- **AA integration eating time** → Privy + Pimlico are the fast path; fallback is plain wagmi wallet-connect if sponsorship setup stalls (UX downgrade only, not a blocker).
- **Testnet flakiness** → MockUSDC we mint freely; deploy + seed scripts are idempotent and re-runnable.
- **Submission mechanics (user)** → watch the password/Apply window; ask in Q&A about solo Startups-track eligibility (per brief).

## 13. Out of scope / future

LP yield strategies, secondary market for receivables, real KYC/AML, off-chain legal wrapper, multi-currency, real fiat ramp via a licensed partner, cross-chain liquidity. The second BUIDL (**Tanda**) is a separate spec.
