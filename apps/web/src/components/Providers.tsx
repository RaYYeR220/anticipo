"use client";
import { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { WagmiProvider as PrivyWagmiProvider, createConfig as createPrivyWagmiConfig } from "@privy-io/wagmi";
import { publicConfig } from "@/lib/config";
import { InjectedWalletProvider } from "@/components/wallet/InjectedWalletProvider";
import { PrivyWalletProvider } from "@/components/wallet/PrivyWalletProvider";

// Build-inlined: when set, the app boots Privy email-login + sponsored smart wallets;
// otherwise the injected (MetaMask) path. Read as a direct member so Next inlines the
// literal — keep the branch deterministic between server and client (no hydration drift).
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  return PRIVY_APP_ID ? (
    <PrivyTree appId={PRIVY_APP_ID}>{children}</PrivyTree>
  ) : (
    <InjectedTree>{children}</InjectedTree>
  );
}

/** Default path: injected browser wallet via wagmi. */
function InjectedTree({ children }: { children: React.ReactNode }) {
  const cfg = useMemo(() => publicConfig(), []);
  const wagmiConfig = useMemo(
    () =>
      createConfig({
        chains: [cfg.chain],
        connectors: [injected()],
        transports: { [cfg.chain.id]: http(cfg.rpcUrl) },
        ssr: true,
      }),
    [cfg],
  );
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InjectedWalletProvider>{children}</InjectedWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

/** Account-abstraction path: Privy email login → ERC-4337 smart wallet, gas sponsored. */
function PrivyTree({ appId, children }: { appId: string; children: React.ReactNode }) {
  const cfg = useMemo(() => publicConfig(), []);
  const wagmiConfig = useMemo(
    () =>
      createPrivyWagmiConfig({
        chains: [cfg.chain],
        transports: { [cfg.chain.id]: http(cfg.rpcUrl) },
      }),
    [cfg],
  );
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: cfg.chain,
        supportedChains: [cfg.chain],
        appearance: { theme: "light", accentColor: "#C2410C" }, // terracotta
      }}
    >
      <SmartWalletsProvider>
        <QueryClientProvider client={queryClient}>
          <PrivyWagmiProvider config={wagmiConfig}>
            <PrivyWalletProvider>{children}</PrivyWalletProvider>
          </PrivyWagmiProvider>
        </QueryClientProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
