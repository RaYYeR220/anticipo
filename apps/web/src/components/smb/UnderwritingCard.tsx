"use client";
import type { ReactNode } from "react";
import { Badge, Button, CardHeaderBand, PayoffBlock, ScoreGauge, riskBand } from "@/components/ui";
import type { UnderwriteResponse } from "@/lib/underwriteClient";
import { formatBps, formatUsdc, shortAddr, txUrl } from "@/lib/format";
import { knownBuyer } from "@/lib/buyers";
import { publicConfig } from "@/lib/config";

export type UnderwriteState =
  | { status: "idle" }
  | { status: "loading"; buyer: string }
  | { status: "result"; data: UnderwriteResponse }
  | { status: "error"; message: string };

export interface FinanceLike {
  isPending: boolean;
  isMining: boolean;
  isSuccess: boolean;
  hash?: `0x${string}`;
  error: { message?: string } | null;
}

const BAND_LABEL = { low: "Low risk", medium: "Medium risk", high: "High risk" } as const;
const BAND_DOT = { low: "bg-agave", medium: "bg-sun", high: "bg-terracotta" } as const;
const BAND_TEXT = { low: "text-agave-deep", medium: "text-terracotta-deep", high: "text-terracotta-deep" } as const;

/** Outer chrome shared by every state (agave header band + sun-glow card). */
function Shell({ children }: { children: ReactNode }) {
  return (
    <section
      className="relative overflow-hidden rounded-card border-2 border-agave/25 shadow-warm"
      style={{ background: "radial-gradient(700px 300px at 100% 0, rgba(233,169,59,0.22), transparent 60%), #fffaf0" }}
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
      <div className="px-[30px] pb-[30px] pt-[26px]">{children}</div>
    </section>
  );
}

export function UnderwritingCard({
  state,
  finance,
  onAccept,
}: {
  state: UnderwriteState;
  finance: FinanceLike;
  onAccept: () => void;
}) {
  if (state.status === "idle") {
    return (
      <Shell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <ScoreGauge score={0} />
          <p className="mt-5 max-w-[300px] text-[14px] text-ink-soft">
            Submit an invoice and the AI underwriter prices your advance from the buyer&apos;s on-chain repayment
            history — in seconds.
          </p>
        </div>
      </Shell>
    );
  }

  if (state.status === "loading") {
    const who = knownBuyer(state.buyer) ?? shortAddr(state.buyer);
    return (
      <Shell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="h-32 w-32 animate-pulse rounded-full border-[10px] border-agave/20 border-t-agave" />
          <p className="mt-6 font-display text-[18px] font-semibold text-agave-deep">Reading {who}&apos;s history…</p>
          <p className="mt-1.5 max-w-[320px] text-[13px] text-ink-soft">
            Scoring on-chain repayments, volume and defaults, then pricing the advance &amp; fee.
          </p>
        </div>
      </Shell>
    );
  }

  if (state.status === "error") {
    return (
      <Shell>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-terracotta/15 text-3xl">⚠️</div>
          <p className="mt-4 font-display text-[18px] font-semibold text-terracotta-deep">Underwriting failed</p>
          <p className="mt-1.5 max-w-[340px] text-[13px] text-ink-soft">{state.message}</p>
          <p className="mt-3 max-w-[340px] text-[12px] text-ink-soft">
            Check that the underwriter service is configured (OPENROUTER_API_KEY, RPC_URL, contract addresses).
          </p>
        </div>
      </Shell>
    );
  }

  // result
  const { decision, quote } = state.data;
  const band = riskBand(decision.riskScore);
  const feeAmount = (quote.faceAmount * BigInt(quote.feeBps)) / 10_000n;
  const cfg = publicConfig();
  const link = finance.hash ? txUrl(cfg.chainId, finance.hash) : null;

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-6">
        <ScoreGauge score={decision.riskScore} />
        <div>
          <div className={`flex items-center gap-2 font-display text-[20px] font-semibold ${BAND_TEXT[band]}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${BAND_DOT[band]}`} />
            {BAND_LABEL[band]}
          </div>
          <p className="mt-1 max-w-[230px] text-[13px] text-ink-soft">
            Buyer creditworthiness scored from on-chain repayment history.
          </p>
          <div className="mt-3.5 flex gap-[18px]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Advance</div>
              <div className="font-display text-[22px] font-semibold text-agave-deep">
                {formatBps(decision.advanceRatioBps)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">Fee</div>
              <div className="font-display text-[22px] font-semibold text-terracotta">{formatBps(decision.feeBps)}</div>
            </div>
          </div>
        </div>
      </div>

      <PayoffBlock
        caption="You get advanced now"
        amount={formatUsdc(decision.advanceAmount)}
        breakdown={`You receive now ${formatUsdc(decision.advanceAmount)} USDC · Fee ${formatUsdc(
          feeAmount,
        )} USDC · Buyer repays ${formatUsdc(quote.faceAmount)} USDC at due date`}
      />

      {decision.rationale ? (
        <div className="mt-5 flex gap-3 rounded-2xl border-[1.5px] border-line bg-cream px-[18px] py-4">
          <div className="h-6 font-display text-[38px] font-black leading-[0.7] text-sun">“</div>
          <p className="text-[14px] leading-relaxed text-ink">{decision.rationale}</p>
        </div>
      ) : null}

      {decision.keyFactors.length > 0 ? (
        <div className="mt-[18px] flex flex-wrap gap-2.5">
          {decision.keyFactors.map((f, i) => (
            <Badge key={i} tone={i === decision.keyFactors.length - 1 ? "sun" : "agave"}>
              {f}
            </Badge>
          ))}
        </div>
      ) : null}

      {finance.isSuccess ? (
        <div className="mt-[22px] rounded-[17px] border-[1.5px] border-agave/30 bg-agave/[0.12] px-5 py-4 text-center">
          <div className="font-display text-[18px] font-black text-agave-deep">
            ✓ {formatUsdc(decision.advanceAmount)} USDC advanced to your wallet
          </div>
          {link ? (
            <a href={link} target="_blank" rel="noopener" className="mt-1 inline-block text-[12.5px] font-semibold text-terracotta underline">
              View transaction ↗
            </a>
          ) : finance.hash ? (
            <div className="mt-1 font-mono text-[11px] text-ink-soft">{shortAddr(finance.hash)}</div>
          ) : null}
        </div>
      ) : (
        <>
          <Button
            variant="confirm"
            size="lg"
            fullWidth
            className="mt-[22px]"
            disabled={finance.isPending || finance.isMining}
            onClick={onAccept}
          >
            {finance.isPending
              ? "Confirm in wallet…"
              : finance.isMining
                ? "Advancing USDC…"
                : `Accept & get ${formatUsdc(decision.advanceAmount)} USDC →`}
          </Button>
          {finance.error?.message ? (
            <p className="mt-2.5 text-center text-[12.5px] text-terracotta-deep">
              {finance.error.message.split("\n")[0]}
            </p>
          ) : null}
        </>
      )}
    </Shell>
  );
}
