import { describe, it, expect } from "vitest";
import { formatUsdc, parseUsdc, formatBps, formatPct } from "../src/lib/format.js";

describe("format", () => {
  it("formats USDC (6 decimals) with thousands and 2dp", () => {
    expect(formatUsdc(1_000_000n)).toBe("1.00");
    expect(formatUsdc(1_234_560_000n)).toBe("1,234.56");
    expect(formatUsdc(0n)).toBe("0.00");
  });
  it("parses a USDC string to 6-decimal bigint", () => {
    expect(parseUsdc("100")).toBe(100_000_000n);
    expect(parseUsdc("1.5")).toBe(1_500_000n);
  });
  it("formats bps as a percent", () => {
    expect(formatBps(8000)).toBe("80%");
    expect(formatBps(150)).toBe("1.5%");
  });
  it("formats a 0..1 ratio as percent", () => {
    expect(formatPct(0.125)).toBe("12.5%");
    expect(formatPct(null)).toBe("—");
  });
});
