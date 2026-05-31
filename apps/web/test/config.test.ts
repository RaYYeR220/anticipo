import { describe, it, expect } from "vitest";
import { readPublicConfig } from "../src/lib/config.js";

describe("readPublicConfig", () => {
  it("reads addresses + chainId from a provided env map", () => {
    const cfg = readPublicConfig({
      NEXT_PUBLIC_CHAIN_ID: "421614",
      NEXT_PUBLIC_RPC_URL: "https://rpc.example",
      NEXT_PUBLIC_USDC_ADDRESS: "0x0000000000000000000000000000000000000001",
      NEXT_PUBLIC_POOL_ADDRESS: "0x0000000000000000000000000000000000000002",
      NEXT_PUBLIC_REGISTRY_ADDRESS: "0x0000000000000000000000000000000000000003",
      NEXT_PUBLIC_CONTROLLER_ADDRESS: "0x0000000000000000000000000000000000000004",
    });
    expect(cfg.chainId).toBe(421614);
    expect(cfg.addresses.controller).toBe("0x0000000000000000000000000000000000000004");
  });
  it("throws if a required address is missing", () => {
    expect(() => readPublicConfig({ NEXT_PUBLIC_CHAIN_ID: "421614" } as any)).toThrow();
  });
});
