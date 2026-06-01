"use client";
import { useState } from "react";
import { useConfig } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { usdcAbi, controllerAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";
import { useWallet } from "@/lib/wallet";
import { type FlowStatus, isBusy } from "./flow";

/** Buyer pays a financed invoice: approve USDC (face amount) → controller, then payInvoice(id). */
export function usePayInvoice() {
  const { addresses } = publicConfig();
  const config = useConfig();
  const { sendTx } = useWallet();
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [error, setError] = useState<string>();
  const [hash, setHash] = useState<`0x${string}`>();
  const [activeId, setActiveId] = useState<bigint>();

  async function pay(id: bigint, faceAmount: bigint) {
    try {
      setError(undefined);
      setActiveId(id);
      setStatus("approving");
      const approveHash = await sendTx({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: "approve",
        args: [addresses.controller, faceAmount],
      });
      await waitForTransactionReceipt(config, { hash: approveHash });
      setStatus("pending");
      const h = await sendTx({
        address: addresses.controller,
        abi: controllerAbi,
        functionName: "payInvoice",
        args: [id],
      });
      setHash(h);
      setStatus("mining");
      await waitForTransactionReceipt(config, { hash: h });
      setStatus("success");
      return h;
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "payment failed");
      throw e;
    }
  }

  function reset() {
    setStatus("idle");
    setError(undefined);
    setHash(undefined);
    setActiveId(undefined);
  }
  return { pay, status, error, hash, activeId, reset, busy: isBusy(status) };
}
