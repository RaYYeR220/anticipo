"use client";
import { useState } from "react";
import { zeroAddress } from "viem";
import { useConfig, useReadContract } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { usdcAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";
import { useWallet } from "@/lib/wallet";

/** USDC balance + an open faucet (MockUSDC.mint) for the demo. */
export function useUsdc(account?: `0x${string}`) {
  const { addresses } = publicConfig();
  const config = useConfig();
  const { sendTx } = useWallet();
  const [minting, setMinting] = useState(false);

  const { data: balance, refetch } = useReadContract({
    address: addresses.usdc,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [account ?? zeroAddress],
    query: { refetchInterval: 5000 },
  });

  async function faucet(amount: bigint) {
    if (!account) throw new Error("connect a wallet");
    setMinting(true);
    try {
      const h = await sendTx({
        address: addresses.usdc,
        abi: usdcAbi,
        functionName: "mint",
        args: [account, amount],
      });
      await waitForTransactionReceipt(config, { hash: h });
      await refetch();
      return h;
    } finally {
      setMinting(false);
    }
  }

  return { balance: (balance as bigint) ?? 0n, faucet, minting, refetch };
}
