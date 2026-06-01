import type { Address, Chain } from "viem";
import { defineChain } from "viem";
import { arbitrumSepolia } from "viem/chains";
import type { PublicEnv } from "./env.js";

export interface AppAddresses {
  usdc: Address;
  pool: Address;
  registry: Address;
  controller: Address;
}
export interface PublicConfig {
  chainId: number;
  rpcUrl: string;
  addresses: AppAddresses;
  chain: Chain;
}

function requireAddr(env: Partial<PublicEnv>, key: keyof PublicEnv): Address {
  const v = env[key];
  if (!v || !/^0x[0-9a-fA-F]{40}$/.test(v)) throw new Error(`config: missing/invalid ${key}`);
  return v as Address;
}

export function readPublicConfig(env: Partial<PublicEnv>): PublicConfig {
  const chainId = Number(env.NEXT_PUBLIC_CHAIN_ID);
  if (!chainId) throw new Error("config: missing NEXT_PUBLIC_CHAIN_ID");
  const rpcUrl = env.NEXT_PUBLIC_RPC_URL ?? "";
  const chain =
    chainId === arbitrumSepolia.id
      ? arbitrumSepolia
      : defineChain({
          id: chainId,
          name: `chain-${chainId}`,
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: { default: { http: [rpcUrl] } },
        });
  return {
    chainId,
    rpcUrl,
    chain,
    addresses: {
      usdc: requireAddr(env, "NEXT_PUBLIC_USDC_ADDRESS"),
      pool: requireAddr(env, "NEXT_PUBLIC_POOL_ADDRESS"),
      registry: requireAddr(env, "NEXT_PUBLIC_REGISTRY_ADDRESS"),
      controller: requireAddr(env, "NEXT_PUBLIC_CONTROLLER_ADDRESS"),
    },
  };
}

// Convenience for the browser. Each NEXT_PUBLIC_* MUST be read as a direct static
// `process.env.NEXT_PUBLIC_X` member expression so Next inlines the literal into the
// client bundle — aliasing `process.env` to an object skips inlining (vars become
// undefined in the browser and this throws on hydration).
export function publicConfig(): PublicConfig {
  return readPublicConfig({
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS,
    NEXT_PUBLIC_POOL_ADDRESS: process.env.NEXT_PUBLIC_POOL_ADDRESS,
    NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
    NEXT_PUBLIC_CONTROLLER_ADDRESS: process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS,
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    NEXT_PUBLIC_PIMLICO_API_KEY: process.env.NEXT_PUBLIC_PIMLICO_API_KEY,
  });
}
