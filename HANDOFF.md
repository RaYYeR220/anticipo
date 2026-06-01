# Anticipo — Session Handoff / Continue Here

**Read this first after a `/compact` or a new session.** It points at everything needed to keep building without re-discovery.

## What this is
**Anticipo** — AI invoice-factoring on Arbitrum. ETHMexico 2026 hackathon (DoraHacks, w/ Bitso). **Submit by 2026-06-05 18:00.** Solo build, maximal scope, fast cadence. Tech is the assistant's call. Design = warm-LATAM (see below).

- Concept: `BRIEF.md`
- Design spec (source of truth): `docs/superpowers/specs/2026-05-29-anticipo-design.md`
- Plans: `docs/superpowers/plans/` (phase 1 contracts, phase 2 underwriter, phase 3 frontend, **phase 4 deploy+demo**)
- Cross-session memory: `C:\Users\egori\.claude\projects\C--Users-egori-Desktop-projects-ethmexico-bitso\memory\` (see `anticipo-build-status.md`, `user-fast-builder-max-scope.md`)

## Build method (keep using this)
Roadmap = 4 phases, each: brainstorm→spec→plan→build. Build is **subagent-driven** (superpowers:subagent-driven-development) with reviews where it pays; mechanical tasks with exact plan code can be done inline. After a phase: run all tests, then superpowers:finishing-a-development-branch → merge to `main`. Each phase on its own `feat/phaseN-...` branch off `main`.

## Status (as of 2026-06-01)
- **Phase 1 — contracts — DONE, on `main`.** Foundry, 29 tests. MockUSDC, LiquidityPool (ERC-4626), InvoiceRegistry (ERC-721 + buyer reputation), FactoringController (EIP-712 quote verify, settle, default), `script/Deploy.s.sol`.
- **Phase 2 — `@anticipo/shared` SDK — DONE, on `main`.** vitest, 15 tests. `underwrite()` = on-chain features → Gemini (OpenRouter) → clamps → EIP-712 sign. Anvil round-trip proves the TS signature is accepted on-chain.
- **Phase 3 — `apps/web` Next.js frontend — DONE, MERGED to `main`.** 8 web tests. Design **#11 "warm-LATAM"** (chosen from a 20-variant gallery in `apps/web/design-lab/`; see `design-lab/CHOICE.md`) → `tailwind.config.ts` + `globals.css` + `components/ui/*`. All 4 views (landing/SMB/LP/Buyer) + `/api/underwrite` + wagmi hooks. **Verified live** against a seeded local anvil: real on-chain reads + **live Gemini underwriting** (clean buyer → high advance/low fee, late-payer → graded worse terms). `next build` clean.
- **Phase 4 — testnet deploy + public demo — NEXT, not started.** Plan: `docs/superpowers/plans/2026-06-01-anticipo-phase4-deploy-demo.md`.

## Phase 4 — immediate next action
Follow `docs/superpowers/plans/2026-06-01-anticipo-phase4-deploy-demo.md`. Order: (1) deploy contracts to Arbitrum Sepolia via `Deploy.s.sol`; (2) write+run `SeedSepolia.s.sol` (fund actor EOAs with gas, seed Soriana clean + ComMex late); (3) host `apps/web` on Vercel with testnet env; (4) verify the live demo; (5) optional Privy AA; (6) demo video + DoraHacks submission. **Gated on user creds** (testnet RPC + funded deployer key + Vercel account — see plan's Prerequisites). Create branch `feat/phase4-deploy` off `main` first. The contracts/SDK are stable — don't rebuild Phases 1–3.

## Local demo (already working — to bring back up after compact)
The app ran live locally on anvil. To restore:
```bash
anvil --port 8545 --silent                                   # fresh local chain
cd packages/contracts && forge script script/SeedLocal.s.sol:SeedLocal --broadcast --rpc-url http://127.0.0.1:8545
pnpm -F @anticipo/web build && pnpm -F @anticipo/web start    # serves :3000
```
`apps/web/.env.local` (gitignored) already holds the local config (chainId 31337, deterministic anvil addresses, the user's `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=google/gemini-3.5-flash`). Demo wallets: import anvil keys into MetaMask on `http://127.0.0.1:8545` / chainId 31337 (acct1=LP/SMB, acct2=0x3C44…=Soriana clean buyer, acct3=0x90F7…=ComMex late buyer). After restarting anvil, clear MetaMask "activity tab data".

## How to run / verify
- pnpm via corepack (`pnpm@9.15.0`).
- Contracts: `cd packages/contracts && forge test` (29).
- SDK: `pnpm -F @anticipo/shared test` (15). Regen ABIs after contract changes: `pnpm -F @anticipo/shared gen:abi`.
- Web: `pnpm -F @anticipo/web build|start|dev|typecheck|test` (8 tests).

## Gotchas (hard-won this build — do not relearn)
- `Quote.dueDate/expiry/nonce` are **bigint** (viem uint64). uint16 bps stay `number`. USDC = **6 decimals**.
- EIP-712 domain `("Anticipo","1")`, struct `Quote(smb,buyer,faceAmount,dueDate,advanceRatioBps,feeBps,advanceAmount,docHash,expiry,nonce)` — order is load-bearing; SDK matches the contract.
- `@anticipo/shared` is consumed as **TS source** (its `exports`→`src/index.ts`). The web app needs BOTH `transpilePackages:["@anticipo/shared"]` AND a webpack `extensionAlias` (`.js`→`.ts`) in `next.config.ts` — without the alias, `next build` fails to resolve the package's `.js` specifiers. `@wagmi/core` must be a **direct** dep of `apps/web` (used by the write hooks).
- **`NEXT_PUBLIC_*` only inline when read as a direct `process.env.NEXT_PUBLIC_X` member** — never alias `process.env` to an object (the client gets `undefined` → hydration crash). See `lib/config.ts publicConfig()`.
- **Server render / curl can pass while the client crashes** — after any provider/env/hook change, check the actual browser console, not just curl.
- The `/api/underwrite` route owns `OPENROUTER_API_KEY` + `UNDERWRITER_PRIVATE_KEY` + nonce allocation (SDK does NOT check `usedNonce`). Keep these **server-only** (never `NEXT_PUBLIC_`). Route serializes ALL bigints (`quote.*` AND `decision.advanceAmount`) or `NextResponse.json` throws.
- LLM `temperature:0` is set so the same buyer history yields stable terms; riskScore is **risk** (0=safest, 100=riskiest) per the prompt.
- Windows: CRLF git warnings are harmless. Intermittent tool-output display garbling was seen this session — re-read a file if its content looks wrong.

## Open follow-up (tracked, not a demo blocker)
Pool hardening before any untrusted use: cap `maxWithdraw`/`maxRedeem` at `availableLiquidity`, set ERC4626 `_decimalsOffset()`, zero-address guards on `setController`/`setUnderwriter`.

## Creds the user provides for Phase 4 (none block local dev)
**Have:** OpenRouter key + `OPENROUTER_MODEL=google/gemini-3.5-flash`. **Need:** Arbitrum Sepolia RPC + a deployer key funded with testnet ETH (= the underwriter) + Vercel account · optional Arbiscan key · optional Privy app id + Pimlico key (Task 5 AA; injected fallback always works).
