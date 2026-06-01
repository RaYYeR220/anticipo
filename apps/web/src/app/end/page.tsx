import type { Metadata } from "next";
import { PapelBanner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Anticipo — Cobra hoy, no en 45 días",
};

const CHIPS = [
  { glyph: "✉️", label: "Email login · gasless" },
  { glyph: "🤖", label: "AI-underwritten" },
  { glyph: "⚡", label: "Arbitrum" },
  { glyph: "💵", label: "USDC" },
  { glyph: "🔏", label: "EIP-712 quotes" },
];

/** Full-screen branded end card for the demo video's final frame.
 * Open /end at 1920×1080 and screenshot (or hold it on camera). */
export default function EndCard() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cream">
      <PapelBanner variant="terracotta" />

      {/* warm sun glow behind the lockup */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 50% 40%, rgba(233,169,59,0.20), transparent 70%)",
        }}
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 text-center">
        {/* brand lockup */}
        <div className="flex items-center gap-5">
          <div
            className="grid place-items-center rounded-[22px] bg-grad-mark shadow-warm"
            style={{ width: 92, height: 92 }}
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 52, height: 52 }}>
              <path
                d="M4 14L9 6l4 6 3-4 4 6"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="6" r="1.6" fill="#fff" />
            </svg>
          </div>
          <span className="font-display text-[88px] font-black leading-none tracking-tight text-ink">
            Anti<span className="text-terracotta">cipo</span>
          </span>
        </div>

        {/* tagline */}
        <h1 className="mt-10 font-display text-[42px] font-black italic leading-tight text-terracotta-deep">
          Cobra hoy, no en 45 días.
        </h1>
        <p className="mt-4 max-w-[42rem] text-[20px] leading-relaxed text-ink-soft">
          AI invoice-factoring on Arbitrum — turn an unpaid invoice into instant USDC,
          priced by an on-chain underwriter.
        </p>

        {/* tech chips */}
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {CHIPS.map((c) => (
            <li
              key={c.label}
              className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line bg-card px-4 py-2 text-[14.5px] font-semibold text-ink"
            >
              <span aria-hidden>{c.glyph}</span>
              {c.label}
            </li>
          ))}
        </ul>

        {/* links */}
        <div className="mt-11 flex flex-wrap items-center justify-center gap-3.5">
          <span className="inline-flex items-center gap-2.5 rounded-full bg-grad-primary px-6 py-3.5 text-[17px] font-semibold text-white shadow-btn-primary">
            <span aria-hidden>🌐</span> anticipo-red.vercel.app
          </span>
          <span className="inline-flex items-center gap-2.5 rounded-full border-2 border-ink/15 bg-card px-6 py-3.5 text-[17px] font-semibold text-ink">
            <GitHubMark /> github.com/RaYYeR220/anticipo
          </span>
        </div>

        <p className="mt-11 text-[13px] font-bold uppercase tracking-[0.5px] text-ink-soft">
          Built for ETHMexico 2026 · with Bitso
        </p>
      </main>

      <PapelBanner variant="agave" />
    </div>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-[19px] w-[19px]">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}
