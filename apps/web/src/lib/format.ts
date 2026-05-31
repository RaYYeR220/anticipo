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
