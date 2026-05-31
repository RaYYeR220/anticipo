import { formatUnits, parseUnits } from "viem";

export function formatUsdc(amount: bigint): string {
  const n = Number(formatUnits(amount, 6));
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function parseUsdc(value: string): bigint {
  return parseUnits(value as `${number}`, 6);
}
export function formatBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}
export function formatPct(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Short 0x… address for display. */
export function shortAddr(address?: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Unix seconds → "Mon DD, YYYY". */
export function formatDate(sec: number | bigint): string {
  const ms = Number(sec) * 1000;
  return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Block-explorer tx URL for the chain (Arbiscan for Arbitrum; empty for local anvil). */
export function txUrl(chainId: number, hash: string): string | null {
  if (chainId === 421614) return `https://sepolia.arbiscan.io/tx/${hash}`;
  if (chainId === 42161) return `https://arbiscan.io/tx/${hash}`;
  return null; // local anvil / unknown
}

/** Days from now until a unix-seconds timestamp (negative = overdue). */
export function daysUntil(sec: number | bigint): number {
  return Math.round((Number(sec) * 1000 - Date.now()) / 86_400_000);
}
