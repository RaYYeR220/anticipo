"use client";
import { useState } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { controllerAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";
import { useWallet } from "@/lib/wallet";
import type { Quote } from "@anticipo/shared";

/** SMB accepts a signed quote → requestFinancing (single tx; advances USDC to the SMB).
 * Routes through the wallet abstraction so it works for both injected and sponsored
 * (Privy smart-wallet) flows; the returned shape is unchanged for UnderwritingCard. */
export function useFinance() {
  const { addresses } = publicConfig();
  const { sendTx } = useWallet();
  const [hash, setHash] = useState<`0x${string}`>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function accept(quote: Quote, signature: `0x${string}`) {
    setError(null);
    setIsPending(true);
    try {
      const h = await sendTx({
        address: addresses.controller,
        abi: controllerAbi,
        functionName: "requestFinancing",
        args: [quote, signature],
      });
      setHash(h);
      return h;
    } catch (e) {
      setError(e instanceof Error ? e : new Error("financing failed"));
      throw e;
    } finally {
      setIsPending(false);
    }
  }

  function reset() {
    setHash(undefined);
    setError(null);
    setIsPending(false);
  }
  return { accept, hash, isPending, isMining, isSuccess, error, reset };
}
