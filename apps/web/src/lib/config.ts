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

// Convenience for the browser (reads process.env.NEXT_PUBLIC_* inlined by Next at build).
export function publicConfig(): PublicConfig {
  return readPublicConfig(process.env as unknown as Partial<PublicEnv>);
}
