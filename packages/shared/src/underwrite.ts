import type { Account, Address, Hex } from "viem";
import type { ContractAddresses, MinimalPublicClient } from "./features.js";
import { extractFeatures } from "./features.js";
import { priceWithLLM } from "./pricing.js";
import { buildQuote, signQuote } from "./sign.js";
import { buildQuoteDomain } from "./eip712.js";
import type { InvoiceInput, Quote, UnderwritingDecision } from "./types.js";
import type { UnderwriterLLM } from "./llm.js";

export interface UnderwriteDeps {
  client: MinimalPublicClient;
  addrs: ContractAddresses & { controller: Address };
  chainId: number;
  llm: UnderwriterLLM;
  signer: Account;
  nonce: bigint;
  nowSec: number;
  quoteTtlSec?: number; // default 3600
}

export interface UnderwriteResult {
  decision: UnderwritingDecision;
  quote: Quote;
  signature: Hex;
}

export async function underwrite(input: InvoiceInput, deps: UnderwriteDeps): Promise<UnderwriteResult> {
  const features = await extractFeatures(deps.client, deps.addrs, { buyer: input.buyer, nowSec: deps.nowSec });
  const decision = await priceWithLLM(features, input, deps.llm);
  const expiry = BigInt(deps.nowSec + (deps.quoteTtlSec ?? 3600));
  const quote = buildQuote(input, decision, { nonce: deps.nonce, expiry });
  const domain = buildQuoteDomain(deps.chainId, deps.addrs.controller);
  const signature = await signQuote(deps.signer, domain, quote);
  return { decision, quote, signature };
}
