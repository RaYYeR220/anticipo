# Anticipo — Demo Video Script (~1:50)

**Voiceover:** English (international judges; Spanish tagline kept as an accent). ElevenLabs.
**Screen:** record on the live app `https://anticipo-red.vercel.app`.
**Workflow:** generate each VO line in ElevenLabs first, then capture the screen and trim each shot to its VO clip (VO drives length, not the reverse).

---

## Pre-production checklist

- **Browser:** Chrome, fresh profile. Hide the bookmarks bar (Ctrl+Shift+B). Window ~1440×900, zoom 100%.
- **Recorder:** OBS or Loom at **1080p (or 1440p), 30fps**. Turn on **cursor highlight / click rings** if your tool has it.
- **Pre-state the demo wallet (do BEFORE recording):**
  1. Open `/smb`, click **Entrar con email**, log in with your email + OTP. Confirm the pill + **⚡ sin gas** badge appear. (You'll re-show the login on camera but pre-doing it once warms it up.)
  2. Decide: either (A) **show the login live** and jump-cut past the email-code wait, or (B) start already logged in and just narrate it. (A) is more convincing.
- **Buyer addresses to paste in the form:**
  - Soriana (clean): `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` *(already prefilled)*
  - Comercial Mexicana (late): `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
- **Optional music:** soft, upbeat LATAM/acoustic bed at ~15% volume.

---

## Timeline (Time · On screen · Voiceover)

### 1 — Problem · `0:00–0:10` · landing page `/`
**On screen:** Land on `/`. Slow scroll over the hero ("Cobra hoy, no en 45 días"). Let the warm design + tagline breathe.
**Voiceover:**
> "In Latin America, a small business sells, delivers… and then waits forty-five to ninety days to get paid. But payroll can't wait. Anticipo turns an unpaid invoice into cash — today."

### 2 — Email login, no seed phrase (account abstraction) · `0:10–0:23` · `/smb`
**On screen:** Go to `/smb`. Click **Entrar con email**. Show the Privy modal, type the email. **Jump-cut** past the code entry. Land on the connected state: the address pill + **⚡ sin gas** badge (zoom/point the cursor at the badge).
**Voiceover:**
> "No seed phrase. No crypto wallet. I sign in with just my email — and Anticipo creates a smart account for me. And watch the gas… there isn't any. A paymaster covers it."

### 3 — The load-bearing AI: clean buyer · `0:23–0:48` · `/smb`
**On screen:** In "Finance an invoice": buyer is **Soriana** (✓ resolved). Change **face amount to `12000`**. Click **Get AI quote ✨**. Let the **"Reading Soriana's history…"** animation play (~2–3s), then the result card fills: gauge **low / risk 10**, **Advance 92%**, **Fee 1.2%**, and the rationale quote. Click **Accept & get 11,040 USDC →**. Show the success state **"✓ 11,040 USDC advanced"** — emphasize **no MetaMask popup, no gas**.
**Voiceover:**
> "I've got a twelve-thousand-dollar invoice, owed by Soriana. I ask for a quote. Our AI underwriter reads Soriana's real on-chain payment history — three invoices, all paid on time — and prices the advance live: ninety-two percent, a one-point-two percent fee. I accept… and the USDC lands in my account. No gas. No wallet pop-up."

### 4 — Same invoice, risky buyer (proof the AI is real) · `0:48–1:10` · `/smb`
**On screen:** Replace the buyer address with **Comercial Mexicana** (`0x90F7…b906`) — show it resolve to the name. Keep `12000`. Click **Get AI quote** again. Result: gauge **medium / risk 55**, **Advance 70%**, **Fee 6%**, rationale citing the **67% late rate**. Hold on the side-by-side difference (you can briefly cut back to the Soriana numbers).
**Voiceover:**
> "Now the same twelve-thousand-dollar invoice — but a buyer who pays late: Comercial Mexicana. Same request. This time the AI sees a sixty-seven-percent late rate and prices the risk: seventy percent advance, a six percent fee — and it tells me exactly why. The AI isn't decoration. It is the underwriter."

### 5 — The liquidity pool (LPs earn yield) · `1:10–1:25` · `/lp`
**On screen:** Go to `/lp`. Show the big **TVL $504,575**, the utilization bar, and the **share price / yield**. Slow pan across the stat tiles.
**Voiceover:**
> "Where does the money come from? A liquidity pool. Anyone can deposit USDC, earn the fees that financed invoices pay back, and watch their share price grow — there's half a million in TVL backing the advances."

### 6 — How it works, on-chain · `1:25–1:42` · `/smb` result (or a simple architecture card / B-roll)
**On screen:** Either keep the filled quote/result visible, or show `/buyer` (Pay) briefly to imply the repayment loop. Optionally overlay 4 short text labels as they're named: **EIP-712 · ERC-721 · ERC-4626 · Arbitrum**.
**Voiceover:**
> "Under the hood, the AI's decision is an EIP-712 quote — signed, and verified on-chain. The receivable is minted as an NFT, the advance comes from an ERC-4626 vault, and when the buyer pays, the pool is repaid with yield."

### 7 — Close · `1:42–1:52` · branded end card `/end`
**On screen:** Cut to the ready-made full-screen end card at **`anticipo-red.vercel.app/end`** (logo + tagline + tech chips + live & GitHub URLs + ETHMexico). Hold it through the final line.
**Voiceover:**
> "Email login, gasless, AI-priced, settled on Arbitrum. Cobra hoy — no en cuarenta y cinco días. This is Anticipo."

---

## Clean voiceover script (paste into ElevenLabs, one take or per-line)

> In Latin America, a small business sells, delivers… and then waits forty-five to ninety days to get paid. But payroll can't wait. Anticipo turns an unpaid invoice into cash — today.
>
> No seed phrase. No crypto wallet. I sign in with just my email — and Anticipo creates a smart account for me. And watch the gas… there isn't any. A paymaster covers it.
>
> I've got a twelve-thousand-dollar invoice, owed by Soriana. I ask for a quote. Our AI underwriter reads Soriana's real on-chain payment history — three invoices, all paid on time — and prices the advance live: ninety-two percent, a one-point-two percent fee. I accept… and the USDC lands in my account. No gas. No wallet pop-up.
>
> Now the same twelve-thousand-dollar invoice — but a buyer who pays late: Comercial Mexicana. Same request. This time the AI sees a sixty-seven-percent late rate and prices the risk: seventy percent advance, a six percent fee — and it tells me exactly why. The AI isn't decoration. It is the underwriter.
>
> Where does the money come from? A liquidity pool. Anyone can deposit USDC, earn the fees that financed invoices pay back, and watch their share price grow — there's half a million in TVL backing the advances.
>
> Under the hood, the AI's decision is an EIP-712 quote — signed, and verified on-chain. The receivable is minted as an NFT, the advance comes from an ERC-4626 vault, and when the buyer pays, the pool is repaid with yield.
>
> Email login, gasless, AI-priced, settled on Arbitrum. Cobra hoy — no en cuarenta y cinco días. This is Anticipo.

**ElevenLabs settings:** a warm, clear voice (e.g. a confident narrator). Stability ~45–55, Similarity ~75, Style ~10–20%. Keep the "…" ellipses — they create natural beats. Render **per segment** (7 clips) so you can align each to its shot and leave small gaps.

---

## Editing & polish tips
- **Trim the AI "Reading history…" wait** to ~2s if it drags; keep enough to show it's *thinking*.
- **Jump-cut the email OTP** entry (don't film waiting for the code).
- **Zoom-punch** the key numbers (92% / 1.2% → 70% / 6%) and the **⚡ sin gas** badge — these are the two "wow" beats.
- Keep the **clean-vs-risky contrast** unmistakable: consider a 1-second split-screen or a quick cut back to Soriana's numbers.
- Total target **~1:50** (trim segment 6 first if you need to come under 1:30).
- Export 1080p MP4, upload (YouTube unlisted / Loom), drop the link into the DoraHacks BUIDL.
