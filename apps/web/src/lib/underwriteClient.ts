import type { Quote } from "@anticipo/shared";

export interface UnderwriteResponse {
  decision: {
    riskScore: number;
    advanceRatioBps: number;
    feeBps: number;
    advanceAmount: bigint;
    rationale: string;
    keyFactors: string[];
  };
  quote: Quote;
  signature: `0x${string}`;
}

export async function requestUnderwrite(input: {
  smb: `0x${string}`;
  buyer: `0x${string}`;
  faceAmount: string;
  dueDateSec: number;
  docRef: string;
}): Promise<UnderwriteResponse> {
  const res = await fetch("/api/underwrite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "underwrite failed");
  const j = await res.json();
  const q = j.quote;
  const quote: Quote = {
    smb: q.smb,
    buyer: q.buyer,
    faceAmount: BigInt(q.faceAmount),
    dueDate: BigInt(q.dueDate),
    advanceRatioBps: q.advanceRatioBps,
    feeBps: q.feeBps,
    advanceAmount: BigInt(q.advanceAmount),
    docHash: q.docHash,
    expiry: BigInt(q.expiry),
    nonce: BigInt(q.nonce),
  };
  return { decision: { ...j.decision, advanceAmount: BigInt(j.decision.advanceAmount) }, quote, signature: j.signature };
}
