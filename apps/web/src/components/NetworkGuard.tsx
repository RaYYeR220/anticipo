"use client";
import { useMemo } from "react";
import { useWallet } from "@/lib/wallet";
import { publicConfig } from "@/lib/config";

/**
 * Wrong-network guard for the public testnet demo. Relevant only for injected wallets — the
 * Privy smart wallet always operates on the configured chain, so this renders nothing there.
 * When an injected wallet is connected but on a different chain, shows a warm banner with a
 * one-click switch to the app chain.
 */
export function NetworkGuard() {
  const cfg = useMemo(() => publicConfig(), []);
  const { mode, isConnected, chainId, switchToTarget, isSwitching } = useWallet();

  if (mode === "privy") return null;
  if (!isConnected || chainId === undefined || chainId === cfg.chainId) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-card border-[1.5px] border-terracotta/30 bg-terracotta/[0.07] px-5 py-3.5">
      <span className="text-[19px] leading-none">⚠️</span>
      <p className="flex-1 text-[13.5px] font-medium text-ink">
        Tu wallet está en otra red. Anticipo corre en{" "}
        <span className="font-bold text-terracotta-deep">{cfg.chain.name}</span>.
      </p>
      <button
        onClick={switchToTarget}
        disabled={isSwitching}
        className="rounded-btn bg-grad-primary px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-btn-primary transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSwitching ? "Cambiando…" : `Cambiar a ${cfg.chain.name}`}
      </button>
    </div>
  );
}
