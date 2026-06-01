"use client";
import { AppHeader } from "@/components/AppHeader";
import { PapelBanner, Ribbon } from "@/components/ui";
import { PoolStats, PoolPosition } from "@/components/lp/PoolStats";
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
        {/* Full-width TVL headline, then a balanced two-column row. */}
        <div className="flex flex-col gap-[30px]">
          <PoolStats />
          <div className="grid items-stretch gap-[30px] lg:grid-cols-2">
            <PoolPosition />
            <LpActions />
          </div>
        </div>
      </main>
      <PapelBanner variant="agave" className="mt-10" />
    </>
  );
}
