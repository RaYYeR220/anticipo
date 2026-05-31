// Design-system validation page — composes the SMB hero from ui/* primitives
// (static sample data). Task 6 turns this into the wired SMB view; Task 9 replaces
// this route with the real landing.
import {
  AccountPill,
  Badge,
  Button,
  Card,
  CardHeaderBand,
  CardTitle,
  Field,
  FileChip,
  InputShell,
  Logo,
  PapelBanner,
  PayoffBlock,
  Ribbon,
  ScoreGauge,
  Stat,
} from "@/components/ui";

export default function Home() {
  return (
    <>
      <PapelBanner variant="terracotta" />
      <div className="mx-auto max-w-[1280px] px-9 pb-16">
        <header className="flex flex-wrap items-center gap-6 py-5">
          <Logo />
          <div className="flex flex-1 flex-wrap gap-2">
            <Stat label="Pool TVL" value="$248,500" accent="terracotta" />
            <Stat label="Available" value="$112,300" accent="agave" />
            <Stat label="Yield APY" value="9.2%" accent="sun" />
            <Stat label="Active" value="14" accent="rose" />
          </div>
          <AccountPill email="maria@tiendaroja.mx" address="0x70…79C8" />
        </header>

        <Ribbon
          phrase="Cobra hoy, no en 45 días."
          note="Instant USDC against your receivables · Arbitrum"
          className="mb-8 mt-1.5"
        />

        <div className="grid items-start gap-[30px] lg:grid-cols-[0.86fr_1.14fr]">
          {/* FORM */}
          <Card className="p-[30px]">
            <CardTitle glyph="🧾" sub="Turn one unpaid invoice into working capital today.">
              Finance an invoice
            </CardTitle>
            <div className="mt-6">
              <Field label="Buyer (payer) wallet">
                <InputShell>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="font-display text-[16px] font-semibold">Soriana S.A. de C.V.</span>
                    <span className="font-mono text-[12px] text-ink-soft">0x3C44…93BC</span>
                  </div>
                  <Badge tone="agave" className="ml-auto whitespace-nowrap">
                    ✓ resolved
                  </Badge>
                </InputShell>
              </Field>

              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Invoice face amount">
                  <InputShell>
                    <span className="font-display text-[18px] font-semibold">100.00</span>
                    <span className="text-[12px] font-semibold text-ink-soft">USDC</span>
                  </InputShell>
                </Field>
                <Field label="Due date">
                  <InputShell>
                    <span className="font-display text-[16px] font-semibold">Jul 15, 2026</span>
                    <span className="ml-auto text-[12px] font-semibold text-ink-soft">~45 days</span>
                  </InputShell>
                </Field>
              </div>

              <Field
                label="Invoice document"
                hint={<span>🔒 Hashed (SHA-256) on submit — stored on-chain, file stays private.</span>}
              >
                <FileChip name="factura-0427.pdf" />
              </Field>

              <Button variant="primary" fullWidth className="mt-2">
                Get AI quote <span>✨</span>
              </Button>
            </div>
          </Card>

          {/* AI UNDERWRITING */}
          <section
            className="relative overflow-hidden rounded-card border-2 border-agave/25 shadow-warm"
            style={{
              background:
                "radial-gradient(700px 300px at 100% 0, rgba(233,169,59,0.22), transparent 60%), #fffaf0",
            }}
          >
            <CardHeaderBand
              right={
                <span className="inline-flex items-center gap-2 rounded-full border border-cream/35 bg-cream/[0.16] px-3 py-1.5 text-[12px] font-semibold">
                  <span className="h-[7px] w-[7px] animate-pulse-ring rounded-full bg-sun-soft" />
                  powered by Gemini
                </span>
              }
            >
              AI Underwriting
            </CardHeaderBand>

            <div className="px-[30px] pb-[30px] pt-[26px]">
              <div className="mb-6 flex items-center gap-6">
                <ScoreGauge score={20} />
                <div>
                  <div className="flex items-center gap-2 font-display text-[20px] font-semibold text-agave-deep">
                    <span className="h-2.5 w-2.5 rounded-full bg-agave" />
                    Low risk
                  </div>
                  <p className="mt-1 max-w-[230px] text-[13px] text-ink-soft">
                    Buyer creditworthiness scored from on-chain repayment history.
                  </p>
                  <div className="mt-3.5 flex gap-[18px]">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Advance</div>
                      <div className="font-display text-[22px] font-semibold text-agave-deep">80%</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Fee</div>
                      <div className="font-display text-[22px] font-semibold text-terracotta">2.0%</div>
                    </div>
                  </div>
                </div>
              </div>

              <PayoffBlock
                caption="You get advanced now"
                amount="80.00"
                breakdown="You receive now 80.00 USDC · Fee 2.00 USDC · Buyer repays 100.00 USDC at due date"
              />

              <div className="mt-5 flex gap-3 rounded-2xl border-[1.5px] border-line bg-cream px-[18px] py-4">
                <div className="h-6 font-display text-[38px] font-black leading-[0.7] text-sun">“</div>
                <p className="text-[14px] leading-relaxed text-ink">
                  Soriana has paid <b>6 of 6</b> prior invoices on time, averaging 4 days early. A strong, consistent
                  payment record supports a high advance at a low fee.
                </p>
              </div>

              <div className="mt-[18px] flex flex-wrap gap-2.5">
                <Badge tone="agave" glyph="✓">
                  6/6 on-time
                </Badge>
                <Badge tone="agave" glyph="⏱">
                  Avg 4 days early
                </Badge>
                <Badge tone="agave" glyph="🛡">
                  0 defaults
                </Badge>
                <Badge tone="sun" glyph="💵">
                  $420k paid on-chain
                </Badge>
              </div>

              <Button variant="confirm" size="lg" fullWidth className="mt-[22px]">
                Accept &amp; get 80 USDC →
              </Button>
            </div>
          </section>
        </div>
      </div>
      <PapelBanner variant="agave" className="mt-10" />
    </>
  );
}
