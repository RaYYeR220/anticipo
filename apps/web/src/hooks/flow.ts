/** Shared status for multi-step (approve → action) write flows. */
export type FlowStatus = "idle" | "approving" | "pending" | "mining" | "success" | "error";

export function isBusy(s: FlowStatus): boolean {
  return s === "approving" || s === "pending" || s === "mining";
}
