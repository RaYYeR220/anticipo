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
- **Phase 4 — testnet deploy + public demo — LIVE (deploy/seed/host/AA DONE).** Plan: `docs/superpowers/plans/2026-06-01-anticipo-phase4-deploy-demo.md`. **Remaining:** demo video + DoraHacks submission (user).

## Phase 4 — LIVE deployment (Arbitrum Sepolia, chain 421614)
- **Live app:** https://anticipo-red.vercel.app · **Repo:** https://github.com/RaYYeR220/anticipo (public, `gh` as RaYYeR220)
- **Contracts (deployed + seeded + verified via cast):**
  - MockUSDC `0x5F4d518FF3EeFeA5Ba55E2C365e80dB005032A81`
  - LiquidityPool `0x7Af6d4a94818eA00ccC7104397C5D23a2De9FFbD`
  - InvoiceRegistry `0x1fCd2F496A9B8F533Cc450AE494546e5dE56D918`
  - FactoringController `0xF7a76A45DEd795261c2Ad3F439F635492529Cd49`
  - Underwriter == deployer `0xCDe533a0982402D703f9262c6c2beCE502DE32c9` (throwaway testnet key; in gitignored `packages/contracts/.env`)
- **Seed state:** pool TVL **504,575 USDC**; Soriana (`0x3C44…93BC`) 3 on-time / 230k vol; ComMex (`0x90F7…b906`) 1 on-time + 2 late.
- **Verified LIVE underwriting** (curl `/api/underwrite`): Soriana → risk 10 / 92% / 1.2% ; ComMex → risk 55 / 70% / 6%. Same $12k invoice, terms from real on-chain history.
- **Vercel:** project `anticipo` (`prj_TezMjkRTAZaqpWgJgxGYMcD2w1O1`, org `team_lvJBfWjFQPhKr1nbnuS9RkQn`), Root Directory `apps/web`, framework nextjs. CLI authed as `rayyer220` (token at `%APPDATA%/xdg.data/com.vercel.cli/auth.json`). All 10 env vars set (NEXT_PUBLIC_* + server OPENROUTER_*/UNDERWRITER_PRIVATE_KEY/RPC_URL). **Redeploy:** `vercel deploy --prod --yes` from repo root (project linked via `.vercel/`). Env via API `…/v10/projects/anticipo/env?upsert=true`.
- **Reproduce deploy from scratch:** fund a key → `packages/contracts/.env` (DEPLOYER_PRIVATE_KEY=UNDERWRITER, addresses filled after) → `forge script script/Deploy.s.sol:Deploy --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast` → write addresses to `.env` → `forge script script/SeedSepolia.s.sol:SeedSepolia --rpc-url … --broadcast --slow`.

## Phase 4 — what's left
- **Demo video (user):** record on the live app; ~90s script in `docs/submission/anticipo-dorahacks.md` (clean→risky contrast is the money shot).
- **DoraHacks submission (user):** writeup drafted in the same doc; paste live + repo + video URLs; submit before **2026-06-05 18:00**.
- **Account abstraction (Task 5) — DONE & LIVE on prod.** Email login (Privy) → ERC-4337 smart wallet → gas-sponsored userops via Pimlico paymaster; verified end-to-end (sponsored tx, no gas). Env-gated by `NEXT_PUBLIC_PRIVY_APP_ID` (+ `NEXT_PUBLIC_PIMLICO_API_KEY`); without it the app falls back to injected (MetaMask). Code: `lib/wallet.ts` (`useWallet()` abstraction: active address = smart wallet, `sendTx` routes sponsored vs wagmi), `components/wallet/{Injected,Privy}WalletProvider.tsx`, `Providers.tsx` picks the tree. **Privy dashboard config (one-time, done):** allowed domain `anticipo-red.vercel.app`; email login on; Smart wallets enabled (Safe) with Pimlico bundler+paymaster URL `https://api.pimlico.io/v2/421614/rpc?apikey=…` for chain 421614. To disable AA: remove the 2 NEXT_PUBLIC_PRIVY/PIMLICO env vars on Vercel + redeploy → injected.
- **Minor polish:** add a favicon (console 404 only); optional testnet-ETH faucet link in footer.
- The contracts/SDK are stable — don't rebuild Phases 1–3.

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
