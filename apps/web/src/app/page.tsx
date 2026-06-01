import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import {
  Badge,
  Button,
  Card,
  PapelBanner,
  PayoffBlock,
  Ribbon,
  ScoreGauge,
} from "@/components/ui";

export default function Home() {
  return (
    <>
      <PapelBanner variant="terracotta" />
      <main className="mx-auto max-w-[1280px] px-9 pb-20">
        <AppHeader showPool={false} />

        <Hero />
        <HowItWorks />
        <Roles />
        <TrustBand />
        <Footer />
      </main>
      <PapelBanner variant="agave" className="mt-12" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="grid items-center gap-12 pb-20 pt-8 md:grid-cols-[1.04fr_0.96fr] md:pb-28 md:pt-12">
      <div className="max-w-[34rem]">
        <Ribbon
          phrase="Cobra hoy, no en 45 días."
          note="Get paid today, not in 45 days."
          className="mb-7"
        />

        <h1 className="font-display text-[clamp(2.6rem,6vw,4.6rem)] font-black leading-[1.02] tracking-tight">
          Turn an unpaid invoice into{" "}
          <span className="relative whitespace-nowrap text-terracotta">
            instant USDC
            <Underline />
          </span>
          .
        </h1>

        <p className="mt-7 max-w-[31rem] text-[1.0625rem] leading-relaxed text-ink-soft">
          Anticipo is AI invoice-factoring for LATAM small businesses on
          Arbitrum. An on-chain underwriter reads your buyer&rsquo;s payment
          history, prices the advance, and a liquidity pool funds you today
          &mdash; settled in USDC, not in 45 days.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/smb">
            <Button variant="primary" size="lg">
              Finance an invoice <span aria-hidden>&rarr;</span>
            </Button>
          </Link>
          <Link href="/lp">
            <Button variant="ghost" size="lg">
              Provide liquidity
            </Button>
          </Link>
          <Link
            href="/buyer"
            className="rounded-btn px-4 py-3 text-[15px] font-semibold text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Pay an invoice
          </Link>
        </div>

        <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.5px] text-ink-soft">
          Built for ETHMexico 2026 &middot; with Bitso
        </p>
      </div>

      <HeroVisual />
    </section>
  );
}

function Underline() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 14"
      preserveAspectRatio="none"
      className="absolute -bottom-1.5 left-0 h-[0.42em] w-full text-sun"
    >
      <path
        d="M2 9 C 60 3, 180 3, 238 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Stylized invoice -> USDC motif: an invoice whose face amount is priced by the
 * AI underwriter (live gauge) into an advance you receive today.
 */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[27rem]">
      <Card className="p-7">
        {/* invoice header — amount + due on the left, the live underwriter gauge
            tucked into the top-right corner so it reads right next to the amount */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-ink-soft">
              Invoice &middot; #A-2041
            </span>
            <div className="mt-1 font-display text-[26px] font-black leading-none tabular-nums">
              $12,000{" "}
              <span className="text-[15px] font-semibold text-ink-soft">USDC</span>
            </div>
            <Badge tone="sun" glyph="⏳" className="mt-3">
              Due in 45 days
            </Badge>
          </div>

          <div className="relative shrink-0">
            <span aria-hidden className="absolute inset-1 animate-pulse-ring rounded-full" />
            <div className="relative rounded-full border-2 border-sun/45 bg-card p-1.5 shadow-warm">
              <ScoreGauge score={18} size={72} />
            </div>
          </div>
        </div>

        {/* flow connector */}
        <div className="my-6 flex items-center gap-3">
          <span aria-hidden className="h-px flex-1 bg-line" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-grad-ai-head px-3 py-1.5 text-[12px] font-semibold text-cream">
            <SparkIcon /> AI prices it
          </span>
          <span aria-hidden className="h-px flex-1 bg-line" />
        </div>

        <PayoffBlock
          caption="Advanced to you today"
          amount="11,160"
          breakdown="93% advance · 1.5% fee · buyer repays 12,000 USDC at the due date"
        />

        <div className="mt-5 grid grid-cols-2 gap-3.5">
          <MiniStat
            label="You wait"
            value="0 days"
            hint="Funded on submit"
            accent="agave"
          />
          <MiniStat
            label="Buyer pays"
            value="Day 45"
            hint="Pool repaid + fee"
            accent="terracotta"
          />
        </div>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: "agave" | "terracotta";
}) {
  const bar = accent === "agave" ? "bg-agave" : "bg-terracotta";
  return (
    <div className="relative overflow-hidden rounded-field border-[1.5px] border-line bg-cream px-4 py-3">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-ink-soft">
        {label}
      </div>
      <div className="mt-0.5 font-display text-[19px] font-semibold tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-ink-soft">{hint}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* How it works                                                        */
/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      glyph: "🧾",
      title: "Submit your invoice",
      body: "Add the unpaid invoice and the buyer who owes you. No paperwork, no waiting room.",
    },
    {
      n: "02",
      glyph: "🤖",
      title: "AI prices your advance",
      body: "The underwriter reads the buyer’s on-chain payment history and sets your advance % and fee.",
    },
    {
      n: "03",
      glyph: "💸",
      title: "Receive USDC now",
      body: "A liquidity pool funds you instantly. When the buyer pays at the due date, the pool is repaid.",
    },
  ];

  return (
    <section className="border-t border-line pt-16">
      <SectionHead
        kicker="How it works"
        title="From invoice to USDC in three steps."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.n} className="flex flex-col gap-4 p-7">
            <div className="flex items-center justify-between">
              <span
                aria-hidden
                className="grid h-12 w-12 place-items-center rounded-field border-[1.5px] border-sun/40 bg-sun/[0.16] text-2xl"
              >
                {s.glyph}
              </span>
              <span className="font-display text-[2rem] font-black leading-none text-terracotta/25">
                {s.n}
              </span>
            </div>
            <h3 className="font-display text-[1.35rem] font-black tracking-tight">
              {s.title}
            </h3>
            <p className="text-[0.95rem] leading-relaxed text-ink-soft">
              {s.body}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

function Roles() {
  const roles = [
    {
      href: "/smb",
      glyph: "🏪",
      title: "Small business",
      desc: "Finance an unpaid invoice and get USDC today instead of in 45 days.",
      cta: "Finance an invoice",
    },
    {
      href: "/lp",
      glyph: "🌿",
      title: "Liquidity provider",
      desc: "Fund advances and earn yield from the fees buyers pay at the due date.",
      cta: "Provide liquidity",
    },
    {
      href: "/buyer",
      glyph: "🤝",
      title: "Buyer",
      desc: "Settle an invoice you owe in USDC and keep your on-chain credit strong.",
      cta: "Pay an invoice",
    },
  ];

  return (
    <section className="pt-20">
      <SectionHead
        kicker="Three roles, one market"
        title="Pick your side of the deal."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {roles.map((r) => (
          <Link key={r.href} href={r.href} className="group block">
            <Card className="flex h-full flex-col gap-4 p-7 transition-all duration-150 group-hover:-translate-y-1 group-hover:border-sun group-hover:shadow-warm-lg">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid h-12 w-12 place-items-center rounded-[13px] bg-grad-mark shadow-warm"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-card text-[1.3rem]">
                    {r.glyph}
                  </span>
                </span>
                <h3 className="font-display text-[1.35rem] font-black tracking-tight">
                  {r.title}
                </h3>
              </div>
              <p className="flex-1 text-[0.95rem] leading-relaxed text-ink-soft">
                {r.desc}
              </p>
              <span className="inline-flex items-center gap-1.5 font-semibold text-terracotta-deep transition-all duration-150 group-hover:gap-2.5">
                {r.cta}
                <span aria-hidden>&rarr;</span>
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trust band                                                          */
/* ------------------------------------------------------------------ */

function TrustBand() {
  const chips = [
    { glyph: "⚡", label: "On Arbitrum" },
    { glyph: "💵", label: "Settled in USDC" },
    { glyph: "🤖", label: "AI-underwritten" },
    { glyph: "🔏", label: "EIP-712 signed quotes" },
  ];

  return (
    <section className="relative mt-20 overflow-hidden rounded-card bg-grad-ai-head px-8 py-10 text-cream shadow-warm">
      {/* faint dotted overlay, matching the AI header band */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12px 12px, rgba(255,255,255,0.10) 2px, transparent 3px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div className="max-w-[27rem]">
          <h2 className="font-display text-[1.85rem] font-black leading-tight">
            On-chain by design, settled in USDC.
          </h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-cream/80">
            Every advance is priced transparently and backed by a quote you can
            verify — no black box, no fine print.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2.5">
          {chips.map((c) => (
            <li
              key={c.label}
              className="inline-flex items-center gap-2 rounded-full border border-cream/25 bg-cream/[0.12] px-3.5 py-2 text-[12.5px] font-semibold"
            >
              <span aria-hidden>{c.glyph}</span>
              {c.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-line pt-8 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="h-8 w-8 rounded-[10px] bg-grad-mark shadow-warm"
        />
        <span className="font-display text-[1.1rem] font-black tracking-tight">
          Anti<span className="text-terracotta">cipo</span>
          <span className="ml-2.5 font-sans text-[13px] font-semibold text-ink-soft">
            · ETHMexico 2026
          </span>
        </span>
      </div>
      <p className="text-[13px] text-ink-soft">
        Cobra hoy, no en 45 días. — invoice factoring for LATAM, on-chain.
      </p>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Badge tone="terracotta" className="w-fit">
        {kicker}
      </Badge>
      <h2 className="max-w-[34rem] font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-black leading-[1.08] tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
    </svg>
  );
}
