"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { AccountPill, Button } from "@/components/ui";
import { shortAddr } from "@/lib/format";

/**
 * Email-login-styled wallet control. Connected → the warm AccountPill (click to
 * disconnect). Disconnected → a primary "Conectar" button (injected connector).
 * Privy email login layers on top when NEXT_PUBLIC_PRIVY_APP_ID is configured.
 */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button onClick={() => disconnect()} title="Disconnect" className="transition-transform hover:-translate-y-0.5">
        <AccountPill address={shortAddr(address)} />
      </button>
    );
  }
  return (
    <Button variant="primary" onClick={() => connect({ connector: injected() })} disabled={isPending}>
      {isPending ? "Conectando…" : "Conectar wallet"}
    </Button>
  );
}
