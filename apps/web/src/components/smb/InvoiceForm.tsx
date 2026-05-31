"use client";
import { useState } from "react";
import { isAddress } from "viem";
import { Badge, Button, Card, CardTitle, Field, Input, InputShell } from "@/components/ui";
import { knownBuyer } from "@/lib/buyers";

export interface InvoiceFormValues {
  buyer: string;
  faceAmount: string;
  dueDate: string; // yyyy-mm-dd
  docRef: string;
}

export function InvoiceForm({
  onSubmit,
  loading,
  disabled,
  disabledReason,
}: {
  onSubmit: (v: InvoiceFormValues) => void;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [buyer, setBuyer] = useState("0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
  const [faceAmount, setFaceAmount] = useState("100");
  const [dueDate, setDueDate] = useState("2026-07-15");
  const [docRef, setDocRef] = useState("factura-0427");

  const buyerValid = isAddress(buyer);
  const resolved = buyerValid ? knownBuyer(buyer) : undefined;
  const canSubmit = !loading && !disabled && buyerValid && Number(faceAmount) > 0 && !!dueDate;

  return (
    <Card className="p-[30px]">
      <CardTitle glyph="🧾" sub="Turn one unpaid invoice into working capital today.">
        Finance an invoice
      </CardTitle>

      <div className="mt-6">
        <Field
          label="Buyer (payer) wallet"
          hint={!buyerValid ? <span className="text-terracotta-deep">Enter a valid 0x address.</span> : undefined}
        >
          <InputShell>
            <div className="flex flex-1 flex-col gap-0.5">
              {resolved ? <span className="font-display text-[16px] font-semibold">{resolved}</span> : null}
              <input
                value={buyer}
                onChange={(e) => setBuyer(e.target.value.trim())}
                spellCheck={false}
                className="w-full bg-transparent font-mono text-[12.5px] text-ink-soft outline-none"
              />
            </div>
            {resolved ? (
              <Badge tone="agave" className="ml-auto whitespace-nowrap">
                ✓ resolved
              </Badge>
            ) : null}
          </InputShell>
        </Field>

        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Invoice face amount">
            <InputShell>
              <input
                value={faceAmount}
                onChange={(e) => setFaceAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                className="w-full bg-transparent font-display text-[18px] font-semibold outline-none"
              />
              <span className="text-[12px] font-semibold text-ink-soft">USDC</span>
            </InputShell>
          </Field>
          <Field label="Due date">
            <InputShell>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-transparent font-display text-[15px] font-semibold outline-none"
              />
            </InputShell>
          </Field>
        </div>

        <Field
          label="Invoice reference"
          hint={<span>🔒 Hashed (SHA-256) on submit — stored on-chain, file stays private.</span>}
        >
          <Input value={docRef} onChange={(e) => setDocRef(e.target.value)} placeholder="factura-0427" />
        </Field>

        <Button
          variant="primary"
          fullWidth
          className="mt-2"
          disabled={!canSubmit}
          onClick={() => onSubmit({ buyer, faceAmount, dueDate, docRef })}
        >
          {loading ? "Reading on-chain history…" : "Get AI quote"} <span>✨</span>
        </Button>
        {disabled && disabledReason ? (
          <p className="mt-2.5 text-center text-[12.5px] text-terracotta-deep">{disabledReason}</p>
        ) : null}
      </div>
    </Card>
  );
}
