"use client";
import { AppHeader } from "@/components/AppHeader";
import { PapelBanner, Ribbon } from "@/components/ui";
import { BuyerInvoiceList } from "@/components/buyer/BuyerInvoiceList";

export default function BuyerPage() {
  return (
    <>
      <PapelBanner variant="terracotta" />
      <main className="mx-auto max-w-[1280px] px-9 pb-16">
        <AppHeader />
        <Ribbon
          phrase="Paga lo que debes, on-chain."
          note="Settle invoices instantly · Arbitrum"
          className="mb-8 mt-1.5"
        />
        <div className="mx-auto max-w-[900px]">
          <BuyerInvoiceList />
        </div>
      </main>
      <PapelBanner variant="agave" className="mt-10" />
    </>
  );
}
