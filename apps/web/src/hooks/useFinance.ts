"use client";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { controllerAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";
import type { Quote } from "@anticipo/shared";

/** SMB accepts a signed quote → requestFinancing (single tx; advances USDC to the SMB). */
export function useFinance() {
  const { addresses } = publicConfig();
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function accept(quote: Quote, signature: `0x${string}`) {
    return writeContractAsync({
      address: addresses.controller,
      abi: controllerAbi,
      functionName: "requestFinancing",
      args: [quote, signature],
    });
  }
  return { accept, hash, isPending, isMining, isSuccess, error, reset };
}
