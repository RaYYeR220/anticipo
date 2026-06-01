"use client";
import { useMemo } from "react";
import { encodeFunctionData } from "viem";
import { usePrivy, useLogin, useLogout } from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { WalletContext, type WalletState } from "@/lib/wallet";
import { publicConfig } from "@/lib/config";

// Minimal shape of the Privy smart-account client we rely on (SDK types churn across
// versions; we only need sendTransaction + the account address).
interface SmartClient {
  account?: { address?: `0x${string}` };
  sendTransaction: (tx: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }) => Promise<`0x${string}`>;
}

/**
 * Provides the wallet abstraction backed by Privy email-login + an ERC-4337 smart wallet.
 * Writes are sent as sponsored userops through the smart-wallet client (gas paid by the
 * Pimlico paymaster configured in the Privy dashboard) — the user never needs ETH.
 */
export function PrivyWalletProvider({ children }: { children: React.ReactNode }) {
  const cfg = useMemo(() => publicConfig(), []);
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { client } = useSmartWallets();

  const smartWalletAddress =
    (user?.linkedAccounts?.find((a) => a.type === "smart_wallet") as { address?: `0x${string}` } | undefined)?.address ??
    (client as SmartClient | undefined)?.account?.address;

  const value: WalletState = useMemo(
    () => ({
      mode: "privy",
      ready,
      address: smartWalletAddress,
      isConnected: authenticated && Boolean(smartWalletAddress),
      isConnecting: !ready,
      chainId: cfg.chainId, // the smart wallet always operates on the configured chain
      sponsored: true,
      connect: () => login(),
      disconnect: () => logout(),
      switchToTarget: () => {}, // no-op: smart wallet is always on the app chain
      isSwitching: false,
      sendTx: async (p) => {
        const c = client as SmartClient | undefined;
        if (!c) throw new Error("Smart wallet is still initializing — try again in a moment.");
        // viem's encodeFunctionData is generic over a literal abi; our params are dynamic,
        // so cast the argument object to its parameter type.
        const data = encodeFunctionData({
          abi: p.abi,
          functionName: p.functionName,
          args: p.args,
        } as Parameters<typeof encodeFunctionData>[0]);
        return c.sendTransaction({ to: p.address, data, value: p.value ?? 0n });
      },
    }),
    [ready, authenticated, smartWalletAddress, cfg.chainId, login, logout, client],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
