// Display aliases for known buyer wallets (demo flavor; the Phase 4 seeder funds these).
// Purely cosmetic — resolves an address to a business name in the UI.
const KNOWN: Record<string, string> = {
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc": "Soriana S.A. de C.V.",
  "0x90f79bf6eb2c4f870365e785982e1f101e93b906": "Comercial Mexicana",
  "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65": "Abarrotes del Norte",
};

export function knownBuyer(address?: string): string | undefined {
  if (!address) return undefined;
  return KNOWN[address.toLowerCase()];
}
