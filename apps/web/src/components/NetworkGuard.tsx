"use client";
import { useMemo } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { publicConfig } from "@/lib/config";

/**
 * Wrong-network guard for the public testnet demo. When a wallet is connected but on a
 * different chain than the app targets (Arbitrum Sepolia in production), show a warm banner
 * with a one-click switch — wagmi falls back to `wallet_addEthereumChain` for chains the
 * wallet doesn't know yet (viem's `arbitrumSepolia` carries the params). Renders nothing
 * when disconnected or already on the right chain, so the header stays clean in the happy path.
 */
export function NetworkGuard() {
  const cfg = useMemo(() => publicConfig(), []);
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === undefined || chainId === cfg.chainId) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-card border-[1.5px] border-terracotta/30 bg-terracotta/[0.07] px-5 py-3.5">
      <span className="text-[19px] leading-none">⚠️</span>
      <p className="flex-1 text-[13.5px] font-medium text-ink">
        Tu wallet está en otra red. Anticipo corre en{" "}
        <span className="font-bold text-terracotta-deep">{cfg.chain.name}</span>.
      </p>
      <button
        onClick={() => switchChain({ chainId: cfg.chainId })}
        disabled={isPending}
        className="rounded-btn bg-grad-primary px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-btn-primary transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Cambiando…" : `Cambiar a ${cfg.chain.name}`}
      </button>
    </div>
  );
}
