# Ethereum Mexico 2026 — AI x Blockchain (w/ Bitso)

**Status:** CONFIRMED concept 2026-05-25 — **"Anticipo"** (AI invoice-factoring) as primary, **"Tanda"** as a 2nd BUIDL (see `tanda/BRIEF.md`). User registered. Tech stack at Claude's discretion. Not started. Built in a separate session; this product ships BEFORE the others (June 5) → it's a reuse SOURCE, not a beneficiary — design it standalone, assume no prior code exists.
**Platform:** DoraHacks (WAF-walled — user reads pages via screenshots)
**URL:** https://dorahacks.io/hackathon/ethmexico2026bitso/detail

## Dates
- Online sprint: 2026-05-04 – submit by **2026-06-05 18:00**
- Winners (internal) 2026-06-08; public at Builders Day 2026-06-12; showcase at Stablecoin Conference Jun 15-16
- Online participation valid for ALL prizes (Phase 3 at Bitso office is invite-only)

## Theme & judging
- AI × Blockchain + **payments / stablecoins / remittances**, LATAM focus. Account abstraction, L2s.
- Tags incl. arbitrum, base, ethereum, vercel, **claude** (they recommend Claude Code / v0).
- **Judging: 30% code, 25% innovation, 20% real-world impact (LATAM), 15% Ethereum/L2 stack, 10% demo.** → innovation + impact = 45% = the swing; win by nailing a sharp, non-obvious LATAM pain with load-bearing AI.
- Submit: GitHub + demo video. Teams 1–5.

## Prize reality (verified via screenshots 2026-05-26) — REAL CASH only outside Bitso
| Sponsor | General | Startups | Σ cash | Type |
|---|---|---|---|---|
| **Ethereum Mexico** | 950 ($500/300/150 +200 pool) | 1,500 ($700/400/200 +200 pool) | **2,450** | real USD |
| **Arbitrum** | 380 ($100/50/30 +200 pool) | 650 ($200/150/100 +200 pool) | **1,030** | real USD |
| ~~Bitso Business~~ | ~~1,100~~ | ~~3,900~~ | ~~5,000~~ | **Bitso Business CREDITS** → skip as money |
| SuperRare/Rare | 700 (+100 Rare CLI pool) | 700 | 1,500 | real USD, but NFT/creator theme = off-edge → skip |

- **Real addressable cash = Arbitrum + ETH Mexico = $3,480** (both tracks). General-only floor = **$1,330**.
- **Bitso prizes are Bitso Business credits + mentorship + conference spot — NOT cash.** Therefore **Bitso is dropped as a money target and a build dependency** (no sandbox integration, no email-for-PIN). Anticipo settles natively in USDC on Arbitrum; any fiat on/off-ramp is a mocked/pluggable adapter narrated for the LATAM story, not a real Bitso integration.

## Competition note (important)
9 bounties show "0 BUIDLs" — **NOT because there's no interest**, but because "Apply" is gated behind a password not yet released. 63 hackers already registered, and the "AI × payments LATAM" theme means most will build the obvious "AI payments assistant." So the entry must be a **non-obvious, win-grade** build, not the default. Hence Anticipo (factoring) + Tanda (savings circle) instead of a generic payments agent.

## Strategy — TWO BUIDLs (low-competition hedge)
"Up to 10 bounties per BUIDL." Submit two distinct BUIDLs, each applying to Arbitrum (General+Startups) + ETH Mexico (General+Startups) = two independent shots at the same $3,480 pool. Field is low-competition, so this is a real hedge, not dilution.
1. **Anticipo** — AI invoice-factoring (primary; B2B/SMB → fits Startups track narrative).
2. **Tanda** — AI-organized on-chain savings circle (financial inclusion; dead-center on ETH Mexico's non-profit mission). Full brief: `tanda/BRIEF.md`.

## Concept — "Anticipo" (AI invoice-factoring / working-capital agent for LATAM SMBs)
LATAM SMBs sell on credit and wait 60–90 days to get paid, while payroll and suppliers need cash now. Anticipo turns unpaid invoices into instant cash.
- **Flow:** SMB submits an unpaid invoice (issued to a buyer) → an **AI underwriter agent** scores risk (will the buyer pay, and when) from demonstrable signals → a smart contract tokenizes the invoice as an on-chain receivable, and a **liquidity pool instantly advances ~80–95% in USDC on Arbitrum**. When the buyer pays into an escrow contract, the pool is repaid + a small fee; the SMB gets the remainder; liquidity providers earn yield.
- **AI is load-bearing (the underwriter):** prices the advance ratio + fee from the buyer's on-chain payment history, verifiable invoice data, the SMB's repayment track record, and concentration risk. This is the differentiator vs a generic payments bot.

### Why it wins the rubric
- **Innovation (25%):** autonomous AI underwriter + on-chain receivables-financing pool with dynamic pricing.
- **Impact LATAM (20%):** the working-capital gap is a concrete, painful, well-known SMB problem (informal credit at brutal rates) — strong real-demand story.
- **Code (30%):** pool contract + invoice/receivable token + escrow/settlement + AI agent + frontend = substantial.
- **L2 (15%):** Arbitrum as cheap settlement + the financing pool lives there; native USDC.
- **Demo (10%):** invoice → AI scores → instant advance → buyer pays → pool repaid. Crisp.

## Stack (Claude's call — user doesn't need to engage)
- **Arbitrum (Solidity) contracts:** liquidity pool, invoice/receivable token, escrow + settlement, fee/yield accounting, default handling.
- **AI underwriter agent** (TS/Python): risk scoring + pricing; posts decision on-chain.
- Frontend: Next.js; invisible UX (no gas/seed-phrase friction for the SMB).
- Testnet acceptable; native USDC; fiat ramp = mocked/pluggable adapter (no Bitso integration).

## Demo plan
On Arbitrum testnet: seed a liquidity pool; an SMB submits an invoice against a buyer that has a visible on-chain payment history; AI scores it and prices the advance; pool advances USDC instantly; buyer pays the escrow; pool repaid + fee, SMB gets the remainder. Show a higher-risk invoice getting a lower ratio / higher fee (proves the AI is load-bearing). 1–3 min video.

## Risks / open items (resolve day 1 of build)
- **#1 — AI must be genuinely load-bearing, not cosmetic.** Ground scoring in demonstrable signals (buyer on-chain payment history, verifiable invoice data, SMB track record). For the demo, use a B2B buyer that pays in USDC on-chain so the AI has a real signal to reason over.
- **Scope honesty:** real factoring needs off-chain legal enforceability of the receivable. Keep the demo scoped to **on-chain-verifiable invoices / on-chain-paying buyers**; do NOT claim off-chain legal recourse. Frame the limitation honestly.
- **Default handling:** define what happens if the buyer doesn't pay (recourse to SMB / forfeited collateral / loss priced into the pool fee). Show it.
- **Submission mechanics (user):** "Apply" is password-gated and not yet open; no social links on the page. Watch for the password/apply window; the on-site **Q&A** is the only working channel.
- **Startups-track eligibility (user, via Q&A):** confirm a solo/independent builder qualifies (swings Arbitrum 650 + ETH Mexico 1,500). If company-only, floor is the General tracks ($1,330).

## Next steps
- [ ] (user) watch for the Apply password window; ask in Q&A: Startups-track eligibility for a solo builder.
- [ ] brainstorming → spec → plan for Anticipo (separate build session).
- [ ] Build Anticipo — Arbitrum pool + receivable token + escrow/settlement + AI underwriter agent → factoring demo with verifiable addresses → 1–3 min video.
- [ ] Build Tanda as the 2nd BUIDL (see `tanda/BRIEF.md`); submit both before June 5 18:00; apply each to Arbitrum + ETH Mexico (General + Startups).
