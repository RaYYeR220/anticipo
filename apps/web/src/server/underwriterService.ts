import { keccak256, toHex, parseUnits, type Account, type Address } from "viem";
import { underwrite, type UnderwriterLLM, type Quote, type UnderwritingDecision } from "@anticipo/shared";

export interface UnderwriteRequest {
  smb: Address;
  buyer: Address;
  faceAmount: string; // human USDC, e.g. "100"
  dueDateSec: number; // unix seconds
  docRef: string; // hashed into docHash
}

interface MinimalPublicClient {
  readContract(args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }): Promise<any>;
}

export interface UnderwriteServiceConfig {
  client: MinimalPublicClient;
  chainId: number;
  addresses: { registry: Address; pool: Address; controller: Address };
  signer: Account;
  llm: UnderwriterLLM;
  now?: () => number; // injectable clock (default Date.now/1000)
}

export interface UnderwriteServiceResult {
  decision: UnderwritingDecision;
  quote: Quote;
  signature: `0x${string}`;
  toJSON(): {
    decision: Omit<UnderwritingDecision, "advanceAmount"> & { advanceAmount: string };
    quote: Record<string, string | number>;
    signature: string;
  };
}

// Demo-grade nonce: time-derived, then bumped until usedNonce is false. A production
// service would use a per-underwriter monotonic counter or a DB sequence.
async function allocateNonce(cfg: UnderwriteServiceConfig, controllerAbi: readonly unknown[]): Promise<bigint> {
  let nonce = BigInt(Math.floor((cfg.now?.() ?? Date.now() / 1000)) * 1000 + Math.floor(Math.random() * 1000));
  for (let i = 0; i < 8; i++) {
    const used = (await cfg.client.readContract({
      address: cfg.addresses.controller,
      abi: controllerAbi,
      functionName: "usedNonce",
      args: [nonce],
    })) as boolean;
    if (!used) return nonce; // only ever return a nonce confirmed unused
    nonce += 1n;
  }
  throw new Error("allocateNonce: could not find a free nonce after 8 attempts");
}

export async function runUnderwrite(
  req: UnderwriteRequest,
  cfg: UnderwriteServiceConfig,
): Promise<UnderwriteServiceResult> {
  const { artifacts } = await import("@anticipo/shared");
  const nowSec = cfg.now?.() ?? Math.floor(Date.now() / 1000);
  const nonce = await allocateNonce(cfg, artifacts.FactoringController.abi);

  const { decision, quote, signature } = await underwrite(
    {
      smb: req.smb,
      buyer: req.buyer,
      faceAmount: parseUnits(req.faceAmount as `${number}`, 6),
      dueDate: BigInt(req.dueDateSec),
      docHash: keccak256(toHex(req.docRef)),
    },
    {
      client: cfg.client,
      addrs: cfg.addresses,
      chainId: cfg.chainId,
      llm: cfg.llm,
      signer: cfg.signer,
      nonce,
      nowSec,
    },
  );

  return {
    decision,
    quote,
    signature,
    toJSON() {
      return {
        // advanceAmount is a bigint — serialize it or JSON.stringify (NextResponse.json) throws.
        decision: { ...decision, advanceAmount: decision.advanceAmount.toString() },
        quote: {
          smb: quote.smb,
          buyer: quote.buyer,
          faceAmount: quote.faceAmount.toString(),
          dueDate: quote.dueDate.toString(),
          advanceRatioBps: quote.advanceRatioBps,
          feeBps: quote.feeBps,
          advanceAmount: quote.advanceAmount.toString(),
          docHash: quote.docHash,
          expiry: quote.expiry.toString(),
          nonce: quote.nonce.toString(),
        },
        signature,
      };
    },
  };
}
