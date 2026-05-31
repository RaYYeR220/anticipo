# Design choice — Anticipo web

**Winner: `variant-11` — "warm-LATAM".** Picked by the user (2026-05-31).

**Why:** thematically dead-on for **ETHMexico / Bitso** — warm Mexican palette (terracotta · sun-gold · agave) reads as *humane, regional, trustworthy* while still feeling crafted and modern. It carries an emotional "instant cash for your business" story better than the cold/dark options, and the serif+sans pairing looks premium without being sterile. This is the **single source of truth** the SMB/LP/Buyer views (Tasks 6–9) build against — do not invent a fresh per-view style.

The full reference mockup is `apps/web/design-lab/variant-11.html` (open it; it's the canonical look).

---

## Type
- **Display / headings / numbers:** `Fraunces` (serif). Weights 400/600/900; use opsz. Big amounts, the score, stat values, section titles, the wordmark, CTAs.
- **Body / labels / UI:** `Epilogue` (sans). Weights 400/500/600/700.
- **Mono (addresses, hashes):** `ui-monospace` system stack.
- Labels are uppercase, 12px, weight 700, letter-spacing .5px, color `ink-soft`.

## Color tokens (lock these into globals.css + tailwind theme)
```
terracotta        #c8553d   terracotta-deep  #9e3b29
sun               #e9a93b   sun-soft         #f4c95d
agave             #3f7d5b   agave-deep       #275a3e
rose              #d96c75   teal             #2f8a8a
cream  (page bg)  #fbf3e4   cream-2          #f6e8cf
card   (surface)  #fffaf0
ink    (text)     #3a2418   ink-soft (muted) #7a5c45
line              rgba(58,36,24,.14)
shadow            0 18px 40px -22px rgba(120,55,30,.55)
```
Page background = cream + two soft radial glows (sun top-right ~30%, agave left ~20%).

## Semantic mapping
- **Primary / "get a quote" action:** terracotta gradient `linear-gradient(135deg, terracotta, terracotta-deep)`.
- **Confirm / "accept & receive" action:** agave gradient `linear-gradient(135deg, agave, agave-deep)`. (Green = money received / commit.)
- **Money payoff block:** sun→terracotta gradient `linear-gradient(135deg, sun, terracotta)`, white text.
- **AI / underwriting header band:** agave gradient `linear-gradient(120deg, agave-deep, agave)`, cream text, faint dotted overlay.
- **Risk score → color:** low (≤33) = agave; medium (34–66) = sun; high (≥67) = terracotta/terracotta-deep. Gauge is a conic fill on a `ink @ 10%` track with a cream inner disc.
- **Surfaces:** cards = `card` on `cream` page, 1.5px `line` border, 24px radius, soft `shadow`. Inputs/stats = `cream` fill, 14px radius; input hover border → `sun`.
- **Badges/chips:** agave-tint pill (`agave @ 12%` bg, `agave-deep` text, `agave @ 22%` border) for positive facts; sun-tint variant (`sun @ 18%` bg, `terracotta-deep` text) for the money/highlight chip.

> ⚠️ **Contrast fix when distilling:** `sun (#e9a93b)` as *text* on cream is below AA — only use sun for fills/borders/large display. For the "Advance 80%" stat value prefer `terracotta` (as in the mockup the Fee uses terracotta; keep advance readable — use `agave-deep` or `terracotta-deep` for small numeric text). Verify with the accessibility pass later.

## Radii / shape
cards 24px · inputs & stats 14px · primary buttons 15px · big CTA 17px · payoff block 20px · chips & account pill & status dots 999px.

## Signature decorative elements (brand identity — keep, use sparingly)
- **Papel-picado banner** (CSS radial-gradient mask) as a top strip (terracotta) and bottom strip (agave). One reusable component.
- **Tagline ribbon:** italic Fraunces phrase + dashed sun rule, e.g. **"Cobra hoy, no en 45 días."** / "Get paid today, not in 45 days."
- **Logo mark:** rounded square with a conic sun→terracotta→rose→agave gradient + a little mountain/peak glyph (the "anticipo/horizon" idea). Wordmark `Anti` ink + `cipo` terracotta.
- **Account pill:** ink background, sun-ring border, gradient avatar, green live dot — this is the email-login (account-abstraction) button across all views.

## `components/ui/*` to distill (Task 0 Step 4)
- `Button` — variants: `primary` (terracotta grad), `confirm` (agave grad), `ghost`/`outline` (line border on card). Hover: translateY(-2px) + deeper shadow. Sizes md/lg.
- `Card` — surface card; `CardHeader` band variant for the AI/agave header.
- `Stat` — label + Fraunces value + left accent color bar (pass color). Used in the pool-stats strip.
- `Field` — uppercase label + `Input` (cream fill, sun hover); `BuyerField` (name + mono addr + resolved badge); `FileChip` (dashed sun border).
- `Badge`/`Chip` — agave (default) + sun variants, optional leading glyph.
- `ScoreGauge` — conic gauge, prop `score 0..100` → color by risk band, Fraunces number + "/100".
- `PayoffBlock` — caption + huge Fraunces amount + breakdown line, sun→terracotta gradient.
- `PapelBanner` (top/bottom) + `Ribbon` (tagline) + `Logo` + `AccountPill`.

## Optional grafts from runners-up (nice-to-have, don't block)
- From **#08 data-viz**: a small **buyer payment-history sparkline / 6-dot on-time strip** inside the AI card, to make "6/6 on-time" feel data-driven. Keep it subtle and on-palette (agave dots).
- From **#01 / #18**: the explicit **"You receive / Fee / Buyer repays"** three-line breakdown is already present — keep it crisp.

## Localization note
Copy is bilingual-friendly (ES tagline + EN body in the mockup). Keep ES flavor in hero/marketing strings; keep functional labels EN (or add ES) — final call during view build.
