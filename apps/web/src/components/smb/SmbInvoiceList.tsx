"use client";
import { Badge, Card, CardTitle } from "@/components/ui";
import { useInvoices, type InvoiceStatus } from "@/hooks/useInvoices";
import { formatDate, formatUsdc, shortAddr } from "@/lib/format";
import { knownBuyer } from "@/lib/buyers";

const STATUS: Record<InvoiceStatus, { label: string; tone: "agave" | "sun" | "terracotta" | "neutral" }> = {
  0: { label: "—", tone: "neutral" },
  1: { label: "Financed", tone: "sun" },
  2: { label: "Repaid", tone: "agave" },
  3: { label: "Defaulted", tone: "terracotta" },
};

export function SmbInvoiceList({ smb }: { smb?: `0x${string}` }) {
  const { invoices, isLoading } = useInvoices({ smb });

  return (
    <Card className="mt-[30px] p-[30px]">
      <CardTitle glyph="📑" sub="Receivables you have financed through Anticipo.">
        Your invoices
      </CardTitle>

      <div className="mt-5">
        {!smb ? (
          <Empty>Connect a wallet to see your financed invoices.</Empty>
        ) : isLoading ? (
          <Empty>Loading…</Empty>
        ) : invoices.length === 0 ? (
          <Empty>No financed invoices yet — submit one above to get started.</Empty>
        ) : (
          <div className="overflow-hidden rounded-field border-[1.5px] border-line">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-cream text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <Th>Invoice</Th>
                  <Th>Buyer</Th>
                  <Th className="text-right">Face</Th>
                  <Th>Due</Th>
                  <Th className="text-right">Status</Th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id.toString()} className="border-t-[1.5px] border-line">
                    <Td className="font-mono">#{inv.id.toString()}</Td>
                    <Td>{knownBuyer(inv.buyer) ?? shortAddr(inv.buyer)}</Td>
                    <Td className="text-right font-display font-semibold tabular-nums">{formatUsdc(inv.faceAmount)} USDC</Td>
                    <Td>{formatDate(inv.dueDate)}</Td>
                    <Td className="text-right">
                      <Badge tone={STATUS[inv.status].tone}>{STATUS[inv.status].label}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-field border-[1.5px] border-dashed border-line bg-cream/60 px-5 py-8 text-center text-[13.5px] text-ink-soft">{children}</div>;
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
