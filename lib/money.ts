export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_TEMPO_CHAIN_ID || "4217");
export const OUSD_ADDRESS = "0x20c0" + "0".repeat(20) + "6a37da5c996874be";

export const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

export function parseUnits6(s: string): bigint | null {
  const t = s.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  return BigInt(w) * BigInt(1000000) + BigInt(f.padEnd(6, "0"));
}

export function encodeTransfer(to: string, amount: bigint) {
  return "0xa9059cbb" + to.slice(2).toLowerCase().padStart(64, "0") + amount.toString(16).padStart(64, "0");
}
