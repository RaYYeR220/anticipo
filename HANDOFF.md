# Anticipo — Session Handoff / Continue Here

**Read this first after a `/compact` or a new session.** It points at everything needed to keep building without re-discovery.

## What this is
**Anticipo** — AI invoice-factoring on Arbitrum. ETHMexico 2026 hackathon (DoraHacks, w/ Bitso). **Submit by 2026-06-05 18:00.** Solo build, maximal scope, fast cadence. Tech is the assistant's call.

- Concept: `BRIEF.md`
- Design spec (source of truth): `docs/superpowers/specs/2026-05-29-anticipo-design.md`
- Plans: `docs/superpowers/plans/` (phase 1 contracts, phase 2 underwriter, phase 3 frontend)
- Cross-session memory: `C:\Users\egori\.claude\projects\C--Users-egori-Desktop-projects-ethmexico-bitso\memory\` (see `anticipo-build-status.md`, `user-fast-builder-max-scope.md`)

## Build method (keep using this)
Roadmap = 4 phases, each: brainstorm→spec→plan→build. Build is **subagent-driven TDD** (superpowers:subagent-driven-development): one fresh subagent per plan task with the FULL task text in the prompt, then **two-stage review** (spec-compliance reviewer, then code-quality reviewer; use opus for security-critical contracts), fix loop, mark done. After all tasks: a final whole-phase review (opus), then superpowers:finishing-a-development-branch → merge to `main`, delete the feature branch. Tiny review-driven fixes are applied directly (not via subagent) and verified with the test command. Each phase is built on its own `feat/phaseN-...` branch off `main`.

## Status (as of 2026-05-31)
- **Phase 1 — contracts — DONE, merged to `main`.** Foundry, 29 tests. `packages/contracts/src/`: MockUSDC, LiquidityPool (ERC-4626), InvoiceRegistry (ERC-721 + buyer reputation), FactoringController (EIP-712 quote verify, settle, default), `script/Deploy.s.sol`.
- **Phase 2 — `@anticipo/shared` AI-underwriter SDK — DONE, merged to `main`.** vitest, 15 tests, typecheck clean. `underwrite()` pipeline = read on-chain features → Gemini (OpenRouter, mockable) → clamps → EIP-712 sign. Crown-jewel anvil round-trip proves the TS signature is accepted by the real contract.
- **Phase 3 — `apps/web` Next.js frontend — NEXT, not started.** Plan: `docs/superpowers/plans/2026-05-30-anticipo-phase3-frontend.md`.
- **Phase 4 — seeder + live Arbitrum Sepolia deploy + Vercel + demo video — pending.**

## Phase 3 — immediate next action
Start with **Task 0: Design exploration** (user-directed). Generate **15–20 distinct self-contained static HTML mockups** in `apps/web/design-lab/variant-NN.html` (invoke the `frontend-design` skill; dispatch parallel subagents over disjoint variant ranges & aesthetic directions). Each depicts the **SMB hero screen** (invoice form + AI underwriting result card + header + pool-stats strip) with sample data. Build `design-lab/index.html` gallery, screenshot it, present to user, user picks the winner, record in `design-lab/CHOICE.md`, distill into `globals.css` tokens + `tailwind.config.ts` + `components/ui/*`. THEN Tasks 1–9 build the real app against that design system. (Create branch `feat/phase3-frontend` off `main` first.)

## How to run / verify
- pnpm is enabled via corepack (`pnpm@9.15.0`). If missing: `corepack enable pnpm && corepack prepare pnpm@9.15.0 --activate`.
- Contracts: `cd packages/contracts && forge build && forge test` (29 pass).
- SDK: `pnpm -F @anticipo/shared test` (15 pass) · `pnpm -F @anticipo/shared typecheck` (clean) · regen ABIs after contract changes: `pnpm -F @anticipo/shared gen:abi`.
- Web (after scaffold): `pnpm -F @anticipo/web dev` / `... typecheck` / `... test`.

## Gotchas (do not relearn the hard way)
- `Quote.dueDate`, `Quote.expiry`, `nonce` are **bigint** (viem infers EIP-712 uint64 as bigint). uint16 bps fields stay `number`. USDC = **6 decimals**.
- EIP-712: domain `EIP712("Anticipo","1")`, struct `Quote(smb,buyer,faceAmount,dueDate,advanceRatioBps,feeBps,advanceAmount,docHash,expiry,nonce)` — field order is load-bearing; the SDK's `QUOTE_TYPES`/`buildQuoteDomain` already match the contract (proven on anvil). Build the off-chain signer against the CODE, not older spec prose (no `maxAdvance`).
- `@anticipo/shared` is NodeNext ESM → relative imports use `.js`. `apps/web` uses Next's bundler (no `.js` suffix internally) and must `transpilePackages: ["@anticipo/shared"]`.
- `abi.generated.ts` is committed (decoupled from gitignored `contracts/out/`); regenerate after contract changes.
- The `/api/underwrite` route owns the OpenRouter key + underwriter private key + nonce allocation (SDK does NOT check `usedNonce` — the route must). Keep `UNDERWRITER_PRIVATE_KEY`/`OPENROUTER_API_KEY` server-only (never `NEXT_PUBLIC_`).
- Windows: CRLF git warnings are harmless. Foundry's `anvil` is used by the SDK integration test.

## Open follow-up (tracked, not a blocker)
Pool hardening before any untrusted/mainnet use: override `maxWithdraw`/`maxRedeem` to cap at `availableLiquidity` (LPs currently hit a raw ERC20 revert when withdrawing past idle cash), set ERC4626 `_decimalsOffset()` (inflation-attack mitigation), add zero-address guards on `setController`/`setUnderwriter`.

## Creds the user will provide later (NONE block building/testing — only the live demo)
OpenRouter API key + `OPENROUTER_MODEL` · Privy app id + Pimlico API key (Phase 3 AA; app has an injected-wallet fallback) · Arbitrum Sepolia RPC + funded deployer key + Arbiscan key (Phase 4 deploy).
