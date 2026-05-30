import type { Account, Hex, TypedDataDomain } from "viem";
import { QUOTE_TYPES, QUOTE_PRIMARY_TYPE } from "./eip712.js";
import type { InvoiceInput, Quote, UnderwritingDecision } from "./types.js";

export function buildQuote(
  input: InvoiceInput,
  decision: UnderwritingDecision,
  opts: { nonce: bigint; expiry: bigint },
): Quote {
  return {
    smb: input.smb,
    buyer: input.buyer,
    faceAmount: input.faceAmount,
    dueDate: input.dueDate,
    advanceRatioBps: decision.advanceRatioBps,
    feeBps: decision.feeBps,
    advanceAmount: decision.advanceAmount,
    docHash: input.docHash,
    expiry: opts.expiry,
    nonce: opts.nonce,
  };
}

export async function signQuote(account: Account, domain: TypedDataDomain, quote: Quote): Promise<Hex> {
  if (!account.signTypedData) throw new Error("signQuote: account cannot sign typed data");
  return account.signTypedData({ domain, types: QUOTE_TYPES, primaryType: QUOTE_PRIMARY_TYPE, message: quote });
}
