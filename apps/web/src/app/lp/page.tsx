"use client";
import { AppHeader } from "@/components/AppHeader";
import { PapelBanner, Ribbon } from "@/components/ui";
import { PoolStats } from "@/components/lp/PoolStats";
import { LpActions } from "@/components/lp/LpActions";

export default function LpPage() {
  return (
    <>
      <PapelBanner variant="terracotta" />
      <main className="mx-auto max-w-[1280px] px-9 pb-16">
        <AppHeader />
        <Ribbon
          phrase="Pon tu capital a trabajar."
          note="Earn yield financing real invoices · Arbitrum"
          className="mb-8 mt-1.5"
        />
        <div className="grid items-start gap-[30px] lg:grid-cols-[1.14fr_0.86fr]">
          <PoolStats />
          <LpActions />
        </div>
      </main>
      <PapelBanner variant="agave" className="mt-10" />
    </>
  );
}
