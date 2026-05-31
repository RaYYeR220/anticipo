"use client";
import { useReadContract, useReadContracts } from "wagmi";
import { registryAbi } from "@/lib/contracts";
import { publicConfig } from "@/lib/config";

export type InvoiceStatus = 0 | 1 | 2 | 3; // None, Financed, Repaid, Defaulted

export interface InvoiceView {
  id: bigint;
  smb: `0x${string}`;
  buyer: `0x${string}`;
  faceAmount: bigint;
  dueDate: bigint;
  fundedAt: bigint;
  status: InvoiceStatus;
}

export function useInvoices(filter: { smb?: `0x${string}`; buyer?: `0x${string}` }) {
  const { addresses } = publicConfig();
  const registry = { address: addresses.registry, abi: registryAbi } as const;
  const { data: nextId, isLoading: idLoading } = useReadContract({
    ...registry,
    functionName: "nextId",
    query: { refetchInterval: 5000 },
  });
  const ids = nextId ? Array.from({ length: Number(nextId) - 1 }, (_, i) => BigInt(i + 1)) : [];
  const { data, isLoading: listLoading } = useReadContracts({
    contracts: ids.map((id) => ({ ...registry, functionName: "getInvoice", args: [id] })),
    query: { enabled: ids.length > 0, refetchInterval: 5000 },
  });
  const invoices: InvoiceView[] = (data ?? [])
    .map((d, i) => {
      const r = d.result as Omit<InvoiceView, "id"> | undefined;
      return r ? { id: ids[i], ...r } : undefined;
    })
    .filter((inv): inv is InvoiceView => !!inv && inv.status !== 0)
    .filter(
      (inv) =>
        (filter.smb ? inv.smb.toLowerCase() === filter.smb.toLowerCase() : true) &&
        (filter.buyer ? inv.buyer.toLowerCase() === filter.buyer.toLowerCase() : true),
    );
  return { invoices, isLoading: idLoading || listLoading };
}
