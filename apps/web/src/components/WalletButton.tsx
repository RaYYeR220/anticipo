"use client";
import { AccountPill, Button } from "@/components/ui";
import { shortAddr } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

/**
 * Wallet control over the unified abstraction. Injected mode → "Conectar wallet" (MetaMask).
 * Privy mode → "Entrar con email" (email login → sponsored smart wallet); when connected we
 * flag the gasless smart wallet with a "sin gas" chip.
 */
export function WalletButton() {
  const { mode, address, isConnected, isConnecting, sponsored, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {sponsored ? (
          <span className="hidden rounded-full border-[1.5px] border-agave/30 bg-agave/[0.12] px-2.5 py-1 text-[11.5px] font-bold text-agave-deep sm:inline">
            ⚡ sin gas
          </span>
        ) : null}
        <button
          onClick={disconnect}
          title="Disconnect"
          className="transition-transform hover:-translate-y-0.5"
        >
          <AccountPill address={shortAddr(address)} />
        </button>
      </div>
    );
  }

  const label = isConnecting
    ? "Conectando…"
    : mode === "privy"
      ? "Entrar con email"
      : "Conectar wallet";
  return (
    <Button variant="primary" onClick={connect} disabled={isConnecting}>
      {label}
    </Button>
  );
}
