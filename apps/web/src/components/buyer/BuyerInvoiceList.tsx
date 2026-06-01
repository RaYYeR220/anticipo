"use client";
import { useWallet } from "@/lib/wallet";
import { Badge, Button, Card, CardTitle } from "@/components/ui";
import { useInvoices, type InvoiceStatus, type InvoiceView } from "@/hooks/useInvoices";
import { usePayInvoice } from "@/hooks/usePayInvoice";
import { useUsdc } from "@/hooks/useUsdc";
import { daysUntil, formatDate, formatUsdc, parseUsdc, shortAddr, txUrl } from "@/lib/format";
import { knownBuyer } from "@/lib/buyers";
import { publicConfig } from "@/lib/config";

const STATUS: Record<InvoiceStatus, { label: string; tone: "agave" | "sun" | "terracotta" | "neutral" }> = {
  0: { label: "—", tone: "neutral" },
  1: { label: "Financed", tone: "sun" },
  2: { label: "Repaid", tone: "agave" },
  3: { label: "Defaulted", tone: "terracotta" },
};

const PAY_LABEL: Record<string, string> = {
  approving: "Approving…",
  pending: "Paying…",
  mining: "Paying…",
};

export function BuyerInvoiceList() {
  const { address } = useWallet();
  const { invoices, isLoading } = useInvoices({ buyer: address });
  const pay = usePayInvoice();
  const usdc = useUsdc(address);

  async function handleFaucet() {
    try {
      await usdc.faucet(parseUsdc("1000"));
    } catch {
      /* ignored — demo faucet */
    }
  }

  async function handlePay(inv: InvoiceView) {
    try {
      await pay.pay(inv.id, inv.faceAmount);
    } catch {
      /* surfaced via pay.error */
    }
  }

  return (
    <Card className="p-[30px]">
      <CardTitle glyph="🧾" sub="Invoices addressed to your wallet — settle them in USDC.">
        Invoices you owe
      </CardTitle>

      {/* Wallet balance + faucet */}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-field border-[1.5px] border-line bg-cream px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-ink-soft">
            Your USDC balance
          </span>
          <span className="font-display text-[24px] font-semibold tabular-nums text-agave-deep">
            {formatUsdc(usdc.balance)} USDC
          </span>
        </div>
        <Button
          variant="ghost"
          onClick={handleFaucet}
          disabled={!address || usdc.minting}
        >
          {usdc.minting ? "Minting…" : "Get test USDC"}
        </Button>
      </div>

      <div className="mt-5">
        {!address ? (
          <Empty>Connect a wallet to see invoices you owe.</Empty>
        ) : isLoading ? (
          <Empty>Loading…</Empty>
        ) : invoices.length === 0 ? (
          <Empty>No invoices addressed to you yet.</Empty>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <InvoiceRow
                key={inv.id.toString()}
                inv={inv}
                pay={pay}
                onPay={() => handlePay(inv)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function InvoiceRow({
  inv,
  pay,
  onPay,
}: {
  inv: InvoiceView;
  pay: ReturnType<typeof usePayInvoice>;
  onPay: () => void;
}) {
  const status = STATUS[inv.status];
  const days = daysUntil(inv.dueDate);
  const overdue = days < 0;
  const dueTone: "agave" | "sun" | "terracotta" | "neutral" = overdue ? "terracotta" : days <= 7 ? "sun" : "neutral";
  const dueLabel = overdue ? "overdue" : days === 0 ? "due today" : `in ${days} days`;

  const isActive = pay.activeId === inv.id;
  const payingThis = pay.busy && isActive;
  const succeededThis = pay.status === "success" && isActive;
  const erroredThis = pay.status === "error" && isActive;
  const payDisabled = pay.busy; // disable all pay buttons while any payment is in flight

  const { chainId } = publicConfig();
  const explorer = isActive && pay.hash ? txUrl(chainId, pay.hash) : null;

  return (
    <div className="rounded-field border-[1.5px] border-line bg-cream/60 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[13px] text-ink-soft">#{inv.id.toString()}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <div className="text-[12px] text-ink-soft">
            From {knownBuyer(inv.smb) ?? shortAddr(inv.smb)}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="font-display text-[18px] font-semibold tabular-nums text-ink">
            {formatUsdc(inv.faceAmount)} USDC
          </div>
          <div className="flex items-center gap-2 text-[12px] text-ink-soft">
            <span>Due {formatDate(inv.dueDate)}</span>
            <Badge tone={dueTone}>{dueLabel}</Badge>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {inv.status === 1 ? (
            <Button variant="confirm" onClick={onPay} disabled={payDisabled}>
              {payingThis ? (PAY_LABEL[pay.status] ?? "Paying…") : "Pay invoice"}
            </Button>
          ) : null}
        </div>
      </div>

      {succeededThis ? (
        <div className="mt-3 text-[12.5px] text-agave-deep">
          Paid ✓
          {explorer ? (
            <>
              {" · "}
              <a href={explorer} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                View transaction ↗
              </a>
            </>
          ) : pay.hash ? (
            <>
              {" · "}
              <span className="font-mono">{shortAddr(pay.hash)}</span>
            </>
          ) : null}
        </div>
      ) : null}

      {erroredThis && pay.error ? (
        <div className="mt-3 text-[12.5px] text-terracotta-deep">{pay.error.split("\n")[0]}</div>
      ) : null}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-field border-[1.5px] border-dashed border-line bg-cream/60 px-5 py-8 text-center text-[13.5px] text-ink-soft">
      {children}
    </div>
  );
}
