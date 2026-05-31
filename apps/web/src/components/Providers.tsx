"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { useMemo } from "react";
import { publicConfig } from "@/lib/config";

export function Providers({ children }: { children: React.ReactNode }) {
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

  // When NEXT_PUBLIC_PRIVY_APP_ID is set, wrap with <PrivyProvider> + @privy-io/wagmi's
  // WagmiProvider for email-login embedded wallets + (with Pimlico key) sponsored smart
  // accounts. Without it, the injected connector below is the working fallback.
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
