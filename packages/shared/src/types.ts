import type { Address, Hex } from "viem";

export interface Quote {
  smb: Address;
  buyer: Address;
  faceAmount: bigint;
  dueDate: number;          // unix seconds (uint64)
  advanceRatioBps: number;  // uint16
  feeBps: number;           // uint16
  advanceAmount: bigint;
  docHash: Hex;             // bytes32
  expiry: number;           // unix seconds (uint64)
  nonce: bigint;
}

export interface InvoiceInput {
  smb: Address;
  buyer: Address;
  faceAmount: bigint;
  dueDate: number;
  docHash: Hex;
}

export interface BuyerReputation {
  paidOnTime: number;
  paidLate: number;
  defaulted: number;
  totalVolumeRepaid: bigint;
  firstSeen: number;
}

export interface PoolStats {
  totalAssets: bigint;
  availableLiquidity: bigint;
  outstandingPrincipal: bigint;
  utilization: number; // outstanding / totalAssets, 0..1
}

export interface BuyerFeatures {
  buyer: Address;
  totalInvoices: number;
  onTimeRate: number | null;  // null when no history
  lateRate: number | null;
  defaultRate: number | null;
  totalVolumeRepaid: bigint;
  accountAgeDays: number;
  reputation: BuyerReputation;
  pool: PoolStats;
}

export interface UnderwritingDecision {
  riskScore: number;        // 0..100
  advanceRatioBps: number;  // <= 9500 after clamp
  feeBps: number;           // <= 2000 after clamp
  advanceAmount: bigint;    // computed, advance + fee <= face
  rationale: string;
  keyFactors: string[];
}
