import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "./Badge";

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn("mb-[7px] block text-xs font-bold uppercase tracking-[0.5px] text-ink-soft", className)}>
      {children}
    </label>
  );
}

/** Label + control + optional hint wrapper. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-[18px]", className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <div className="mt-[7px] text-[11px] text-ink-soft">{hint}</div> : null}
    </div>
  );
}

/** Base styled text input (cream fill, sun focus border). */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-field border-[1.5px] border-line bg-cream px-[15px] py-[13px] text-ink outline-none transition-colors placeholder:text-ink-soft/50 hover:border-sun focus:border-sun",
        className,
      )}
      {...props}
    />
  );
});

/** Styled box to compose custom controls (amount + suffix, date, etc.). Mirrors Input's look. */
export function InputShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-field border-[1.5px] border-line bg-cream px-[15px] py-[13px] transition-colors hover:border-sun focus-within:border-sun",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Read-only buyer display: business name + mono address + resolved badge. */
export function BuyerField({
  name,
  address,
  resolved = true,
}: {
  name: string;
  address: string;
  resolved?: boolean;
}) {
  return (
    <InputShell>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-display text-[16px] font-semibold">{name}</span>
        <span className="font-mono text-[12px] text-ink-soft">{address}</span>
      </div>
      {resolved ? (
        <Badge tone="agave" className="ml-auto whitespace-nowrap">
          ✓ resolved
        </Badge>
      ) : null}
    </InputShell>
  );
}

/** Dashed sun-bordered file chip. */
export function FileChip({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 rounded-[12px] border-[1.5px] border-dashed border-sun bg-sun/[0.16] px-3.5 py-2.5 text-[13.5px] font-semibold text-ink",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-terracotta">
        <path
          d="M14 3v5h5M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      {name}
    </span>
  );
}
