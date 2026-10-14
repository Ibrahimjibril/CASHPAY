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

// "Max" amount: the whole balance minus a small buffer for the network fee (paid in the same token).
export function maxSendable(balance: string, recipients = 1): string {
  const bal = parseUnits6(balance || "0") ?? BigInt(0);
  const n = BigInt(Math.max(1, recipients));
  const reserve = BigInt(10000) + BigInt(2000) * n;
  if (bal <= reserve) return "0";
  const per = (bal - reserve) / n;
  const whole = per / BigInt(1000000);
  const frac = (per % BigInt(1000000)).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}
