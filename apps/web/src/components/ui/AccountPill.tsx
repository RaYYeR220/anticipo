import { cn } from "@/lib/cn";

/** Live status dot with a soft ring. */
function LiveDot() {
  return (
    <span
      className="ml-0.5 inline-block h-[7px] w-[7px] rounded-full align-middle"
      style={{ background: "#74e08a", boxShadow: "0 0 0 3px rgba(116,224,138,0.25)" }}
    />
  );
}

/**
 * Email-login (account-abstraction) identity pill. Presentational — WalletButton
 * (Task 4) composes this with wagmi connect/disconnect.
 */
export function AccountPill({
  email,
  address,
  connected = true,
  className,
}: {
  email?: string;
  address: string;
  connected?: boolean;
  className?: string;
}) {
  const initial = (email?.[0] ?? "0").toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border-2 border-sun/45 bg-ink py-1.5 pl-2 pr-4 text-cream shadow-warm",
        className,
      )}
    >
      <div
        className="grid h-[34px] w-[34px] place-items-center rounded-full font-display text-[15px] font-bold text-ink"
        style={{ background: "radial-gradient(circle at 30% 30%, #f4c95d, #c8553d)" }}
      >
        {initial}
      </div>
      <div className="leading-tight">
        {email ? <div className="text-[13px] font-semibold">{email}</div> : null}
        <div className="text-[11px] tracking-wide opacity-65">
          {address}
          {connected ? <LiveDot /> : null}
        </div>
      </div>
    </div>
  );
}
