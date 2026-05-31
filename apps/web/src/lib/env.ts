// Browser-safe public env access. Server-only secrets live in server/ modules.
export interface PublicEnv {
  NEXT_PUBLIC_CHAIN_ID: string;
  NEXT_PUBLIC_RPC_URL: string;
  NEXT_PUBLIC_USDC_ADDRESS: string;
  NEXT_PUBLIC_POOL_ADDRESS: string;
  NEXT_PUBLIC_REGISTRY_ADDRESS: string;
  NEXT_PUBLIC_CONTROLLER_ADDRESS: string;
  NEXT_PUBLIC_PRIVY_APP_ID?: string;
  NEXT_PUBLIC_PIMLICO_API_KEY?: string;
}
