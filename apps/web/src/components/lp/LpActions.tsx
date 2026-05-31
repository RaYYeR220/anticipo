"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Card, CardTitle, Button, Field, Input, InputShell } from "@/components/ui";
import { useLp } from "@/hooks/useLp";
import { useUsdc } from "@/hooks/useUsdc";
import { usePool } from "@/hooks/usePool";
import { formatUsdc, parseUsdc, shortAddr, txUrl } from "@/lib/format";
import { publicConfig } from "@/lib/config";
import { cn } from "@/lib/cn";

const STATUS_TEXT: Record<string, string> = {
  approving: "Approving USDC…",
  pending: "Submitting transaction…",
  mining: "Mining…",
  success: "Done.",
  error: "Something went wrong.",
};

/** Safe parse: returns 0n on empty / invalid input instead of throwing. */
function safeParse(value: string): bigint {
  if (!value || !/^\d*\.?\d*$/.test(value) || value === ".") return 0n;
  try {
    return parseUsdc(value);
  } catch {
    return 0n;
  }
}

export function LpActions() {
  const { address } = useAccount();
  const lp = useLp(address);
  const usdc = useUsdc(address);
  const { shares, sharePrice, available } = usePool(address);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");

  const connected = Boolean(address);
  const cfg = publicConfig();

  async function handleFaucet() {
    if (!connected) return;
    try {
      await usdc.faucet(parseUsdc("1000"));
    } catch {
      /* faucet errors are non-fatal for the demo */
    }
  }

  async function handleDeposit() {
    const amount = safeParse(depositAmount);
    if (!connected || amount <= 0n) return;
    try {
      await lp.deposit(amount);
      setDepositAmount("");
      await usdc.refetch();
    } catch {
      /* surfaced via lp.error */
    }
  }

  async function handleWithdraw() {
    const amount = safeParse(withdrawShares);
    if (!connected || amount <= 0n) return;
    try {
      await lp.withdraw(amount);
      setWithdrawShares("");
    } catch {
      /* surfaced via lp.error */
    }
  }

  function fillMaxShares() {
    setWithdrawShares(formatUsdc(shares).replace(/,/g, ""));
  }

  // Soft warning: rough USDC value of the entered shares exceeds available idle liquidity.
  const enteredShares = safeParse(withdrawShares);
  const roughValue = Number(formatUsdc(enteredShares).replace(/,/g, "")) * sharePrice;
  const availableNum = Number(formatUsdc(available).replace(/,/g, ""));
  const overAvailable = enteredShares > 0n && roughValue > availableNum;

  const statusLine = lp.status !== "idle" ? STATUS_TEXT[lp.status] ?? lp.status : null;
  const firstErrorLine = lp.error?.split("\n")[0];
  const explorerUrl = lp.hash ? txUrl(cfg.chainId, lp.hash) : null;

  return (
    <Card>
      <CardTitle>Provide liquidity</CardTitle>
      <p className="mt-1 text-[13px] text-ink-soft">
        Deposit USDC, receive aUSDC shares, earn the spread on financed invoices.
      </p>

      {/* Wallet balance + faucet */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-cream px-4 py-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-ink-soft">
            Wallet USDC
          </p>
          <p className="mt-0.5 font-display text-[22px] font-black leading-none text-ink">
            ${formatUsdc(usdc.balance)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="md"
          onClick={handleFaucet}
          disabled={!connected || usdc.minting}
        >
          {usdc.minting ? "Minting…" : "Get test USDC"}
        </Button>
      </div>

      {/* Deposit */}
      <div className="mt-5">
        <Field label="Deposit (USDC)">
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            disabled={!connected || lp.busy}
          />
        </Field>
        <Button
          variant="confirm"
          size="lg"
          fullWidth
          className="mt-3"
          onClick={handleDeposit}
          disabled={!connected || lp.busy || safeParse(depositAmount) <= 0n}
        >
          Deposit USDC
        </Button>
      </div>

      {/* Withdraw */}
      <div className="mt-5">
        <Field label="Withdraw (aUSDC shares)">
          <InputShell>
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={withdrawShares}
              onChange={(e) => setWithdrawShares(e.target.value)}
              disabled={!connected || lp.busy}
              className="w-full bg-transparent text-ink outline-none placeholder:text-ink-soft/50 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={fillMaxShares}
              disabled={!connected || lp.busy || shares <= 0n}
              className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold uppercase tracking-[0.5px] text-agave-deep transition-colors hover:bg-agave/[0.12] disabled:opacity-40"
            >
              Max
            </button>
          </InputShell>
        </Field>
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          className="mt-3"
          onClick={handleWithdraw}
          disabled={!connected || lp.busy || safeParse(withdrawShares) <= 0n}
        >
          Withdraw
        </Button>
        <p className="mt-2 text-[12px] text-ink-soft">
          Redeeming more than the pool&apos;s idle liquidity will revert — keep withdrawals at or
          below available.
        </p>
        {overAvailable ? (
          <p className="mt-1 text-[12px] font-semibold text-terracotta">
            Heads up: ~${roughValue.toLocaleString("en-US", { maximumFractionDigits: 2 })} exceeds $
            {availableNum.toLocaleString("en-US", { maximumFractionDigits: 2 })} available — this may
            revert.
          </p>
        ) : null}
      </div>

      {/* Status / tx / error */}
      {!connected ? (
        <p className="mt-4 text-[13px] text-ink-soft">Connect a wallet to provide liquidity.</p>
      ) : null}

      {statusLine ? (
        <p
          className={cn(
            "mt-4 text-[13px] font-semibold",
            lp.status === "success" ? "text-agave-deep" : "text-ink-soft",
          )}
        >
          {statusLine}
        </p>
      ) : null}

      {lp.status === "success" && lp.hash ? (
        <p className="mt-1 text-[13px]">
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-agave-deep underline underline-offset-2"
            >
              View transaction ↗
            </a>
          ) : (
            <span className="font-mono text-ink-soft">{shortAddr(lp.hash)}</span>
          )}
        </p>
      ) : null}

      {firstErrorLine ? (
        <p className="mt-2 text-[13px] font-semibold text-terracotta-deep">{firstErrorLine}</p>
      ) : null}
    </Card>
  );
}
