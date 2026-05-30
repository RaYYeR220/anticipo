import type { Address, TypedDataDomain } from "viem";

/// Must match FactoringController's EIP712("Anticipo","1") and QUOTE_TYPEHASH field order.
export function buildQuoteDomain(chainId: number, verifyingContract: Address): TypedDataDomain {
  return { name: "Anticipo", version: "1", chainId, verifyingContract };
}

export const QUOTE_TYPES = {
  Quote: [
    { name: "smb", type: "address" },
    { name: "buyer", type: "address" },
    { name: "faceAmount", type: "uint256" },
    { name: "dueDate", type: "uint64" },
    { name: "advanceRatioBps", type: "uint16" },
    { name: "feeBps", type: "uint16" },
    { name: "advanceAmount", type: "uint256" },
    { name: "docHash", type: "bytes32" },
    { name: "expiry", type: "uint64" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export const QUOTE_PRIMARY_TYPE = "Quote" as const;
