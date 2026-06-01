"use client";
import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { AppHeader } from "@/components/AppHeader";
import { PapelBanner, Ribbon } from "@/components/ui";
import { InvoiceForm, type InvoiceFormValues } from "@/components/smb/InvoiceForm";
import { UnderwritingCard, type UnderwriteState } from "@/components/smb/UnderwritingCard";
import { SmbInvoiceList } from "@/components/smb/SmbInvoiceList";
import { useFinance } from "@/hooks/useFinance";
import { requestUnderwrite } from "@/lib/underwriteClient";

export default function SmbPage() {
  const { address } = useWallet();
  const [uw, setUw] = useState<UnderwriteState>({ status: "idle" });
  const finance = useFinance();

  async function handleSubmit(v: InvoiceFormValues) {
    if (!address) return;
    setUw({ status: "loading", buyer: v.buyer });
    finance.reset();
    try {
      const dueDateSec = Math.floor(new Date(`${v.dueDate}T00:00:00Z`).getTime() / 1000);
      const data = await requestUnderwrite({
        smb: address,
        buyer: v.buyer as `0x${string}`,
        faceAmount: v.faceAmount,
        dueDateSec,
        docRef: v.docRef,
      });
      setUw({ status: "result", data });
    } catch (e) {
      setUw({ status: "error", message: e instanceof Error ? e.message : "underwrite failed" });
    }
  }

  async function handleAccept() {
    if (uw.status !== "result") return;
    try {
      await finance.accept(uw.data.quote, uw.data.signature);
    } catch {
      /* surfaced via finance.error */
    }
  }

  return (
    <>
      <PapelBanner variant="terracotta" />
      <main className="mx-auto max-w-[1280px] px-9 pb-16">
        <AppHeader />
        <Ribbon
          phrase="Cobra hoy, no en 45 días."
          note="Instant USDC against your receivables · Arbitrum"
          className="mb-8 mt-1.5"
        />
        <div className="grid items-start gap-[30px] lg:grid-cols-[0.86fr_1.14fr]">
          <InvoiceForm
            onSubmit={handleSubmit}
            loading={uw.status === "loading"}
            disabled={!address}
            disabledReason={!address ? "Connect a wallet to request a quote." : undefined}
          />
          <UnderwritingCard state={uw} finance={finance} onAccept={handleAccept} />
        </div>
        <SmbInvoiceList smb={address} />
      </main>
      <PapelBanner variant="agave" className="mt-10" />
    </>
  );
}
