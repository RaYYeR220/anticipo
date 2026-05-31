"use client";
import { useState } from "react";
import { useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { usdcAbi, poolAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";
import { type FlowStatus, isBusy } from "./flow";

/** LP deposit (approve USDC → pool, then deposit) and withdraw (redeem shares). */
export function useLp(account?: `0x${string}`) {
  const { addresses } = publicConfig();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [error, setError] = useState<string>();
  const [hash, setHash] = useState<`0x${string}`>();

  async function deposit(assets: bigint) {
    if (!account) throw new Error("connect a wallet");
    try {
      setError(undefined);
      setStatus("approving");
      const approveHash = await writeContractAsync({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: "approve",
        args: [addresses.pool, assets],
      });
      await waitForTransactionReceipt(config, { hash: approveHash });
      setStatus("pending");
      const h = await writeContractAsync({
        address: addresses.pool,
        abi: poolAbi,
        functionName: "deposit",
        args: [assets, account],
      });
      setHash(h);
      setStatus("mining");
      await waitForTransactionReceipt(config, { hash: h });
      setStatus("success");
      return h;
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "deposit failed");
      throw e;
    }
  }

  async function withdraw(shares: bigint) {
    if (!account) throw new Error("connect a wallet");
    try {
      setError(undefined);
      setStatus("pending");
      const h = await writeContractAsync({
        address: addresses.pool,
        abi: poolAbi,
        functionName: "redeem",
        args: [shares, account, account],
      });
      setHash(h);
      setStatus("mining");
      await waitForTransactionReceipt(config, { hash: h });
      setStatus("success");
      return h;
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "withdraw failed");
      throw e;
    }
  }

  function reset() {
    setStatus("idle");
    setError(undefined);
    setHash(undefined);
  }
  return { deposit, withdraw, status, error, hash, reset, busy: isBusy(status) };
}
