"use client";
import { createContext, useContext } from "react";

/**
 * Wallet abstraction that papers over two modes so the rest of the app never branches:
 *  - "injected": a browser wallet (MetaMask) via wagmi. The active address is the EOA;
 *    writes go through wagmi `writeContractAsync` and the user pays gas.
 *  - "privy": email login → a Privy-managed ERC-4337 smart wallet. The active address is
 *    the SMART WALLET (not the embedded EOA), and writes are sent as sponsored userops via
 *    the Pimlico paymaster (zero gas for the user).
 *
 * The active `address` is deliberately the smart-wallet address in privy mode: it's what
 * holds USDC, receives advances, and must equal `quote.smb` so `requestFinancing` (which
 * requires msg.sender == smb) passes when the smart wallet sends the userop.
 */
export type WalletMode = "injected" | "privy";

export interface SendTxParams {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

export interface WalletState {
  mode: WalletMode;
  ready: boolean; // SDK initialized (privy can be briefly not-ready on first paint)
  address?: `0x${string}`; // active address: smart wallet (privy) | EOA (injected)
  isConnected: boolean;
  isConnecting: boolean;
  chainId?: number; // wallet's current chain (injected) | target chain (privy, always correct)
  sponsored: boolean; // true when writes are gas-sponsored (privy smart wallet)
  connect: () => void; // injected: connect MetaMask | privy: open email-login modal
  disconnect: () => void;
  switchToTarget: () => void; // injected: switch to the app chain | privy: no-op
  isSwitching: boolean;
  sendTx: (p: SendTxParams) => Promise<`0x${string}`>;
}

export const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a wallet provider");
  return ctx;
}
