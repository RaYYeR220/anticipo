"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui";
import { PoolStrip } from "./PoolStrip";
import { WalletButton } from "./WalletButton";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/smb", label: "Finance" },
  { href: "/lp", label: "Pool" },
  { href: "/buyer", label: "Pay" },
];

/** Shared top bar: logo, role nav, live pool strip, wallet. */
export function AppHeader({ showPool = true }: { showPool?: boolean }) {
  const path = usePathname();
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-3 py-5">
      <Link href="/" aria-label="Anticipo home">
        <Logo />
      </Link>
      <nav className="flex items-center gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors",
              path === n.href ? "bg-ink text-cream" : "text-ink-soft hover:bg-card hover:text-ink",
            )}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-x-5 gap-y-3">
        {showPool ? <PoolStrip /> : null}
        <WalletButton />
      </div>
    </header>
  );
}
