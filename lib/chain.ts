import { tokenByAddress } from "@/lib/tokens";

export type Incoming = { hash: string; logIndex: number; sender: string; amount: number; ts: number; symbol: string };

const cache = new Map<string, { at: number; data: Incoming[] }>();

// Incoming token transfers to a wallet, read from Tempo's public API (includes deposits from other wallets/apps).
// force = true skips the short cache (used by the Refresh buttons).
export async function incomingTransfers(wallet: string, force = false): Promise<Incoming[]> {
  const w = String(wallet || "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(w)) return [];
  const hit = cache.get(w);
  if (!force && hit && Date.now() - hit.at < 45000) return hit.data;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://api.tempo.xyz/v1/transfers?chainId=mainnet&recipient=${w}&limit=50&order=desc`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return hit?.data ?? [];
    const j: any = await res.json();
    const out: Incoming[] = [];
    for (const t of j?.data ?? []) {
      const tk = tokenByAddress(t?.sourceToken?.address);
      if (!tk) continue;
      const sender = String(t.sender || "").toLowerCase();
      if (sender === w) continue;
      const amount = Number(String(t?.sourceAmount?.baseUnits ?? "0")) / Math.pow(10, Number(t?.sourceAmount?.decimals ?? 6));
      if (!(amount > 0)) continue;
      out.push({
        hash: String(t.transactionHash).toLowerCase(),
        logIndex: Number(t.logIndex ?? 0),
        sender,
        amount,
        ts: new Date(t.timestamp).getTime(),
        symbol: tk.symbol,
      });
    }
    cache.set(w, { at: Date.now(), data: out });
    return out;
  } catch {
    return hit?.data ?? [];
  }
}
