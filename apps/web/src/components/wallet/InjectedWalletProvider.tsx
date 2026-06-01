"use client";
import { useMemo } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWriteContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { WalletContext, type WalletState, type SendTxParams } from "@/lib/wallet";
import { publicConfig } from "@/lib/config";

/** Provides the wallet abstraction backed by a browser (injected) wallet via wagmi. */
export function InjectedWalletProvider({ children }: { children: React.ReactNode }) {
  const cfg = useMemo(() => publicConfig(), []);
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connect, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const value: WalletState = useMemo(
    () => ({
      mode: "injected",
      ready: true,
      address,
      isConnected,
      isConnecting: isConnecting || isConnectPending,
      chainId,
      sponsored: false,
      connect: () => connect({ connector: injected() }),
      disconnect: () => disconnect(),
      switchToTarget: () => switchChain({ chainId: cfg.chainId }),
      isSwitching,
      // wagmi's writeContractAsync is generically typed against a literal abi/functionName;
      // our params are dynamic at runtime, so cast through to the simple (params → hash) shape.
      sendTx: (p) =>
        (writeContractAsync as unknown as (a: SendTxParams) => Promise<`0x${string}`>)(p),
    }),
    [address, isConnected, isConnecting, isConnectPending, chainId, isSwitching, connect, disconnect, switchChain, writeContractAsync, cfg.chainId],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
