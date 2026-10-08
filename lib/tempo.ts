export const TEMPO = {
  chainId: 4217,
  rpcUrl: process.env.TEMPO_RPC_URL || "https://rpc.tempo.xyz",
  explorer: process.env.TEMPO_EXPLORER_URL || "https://explore.tempo.xyz",
};

// TIP-20 stablecoins CashPay shows. All TIP-20 tokens use 6 decimals.
export const TOKENS = [
  { symbol: "pathUSD", address: "0x20c0000000000000000000000000000000000000", decimals: 6 },
];

export async function getTokenBalance(token: string, owner: string): Promise<bigint> {
  const data = "0x70a08231" + owner.slice(2).toLowerCase().padStart(64, "0");
  const res = await fetch(TEMPO.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: token, data }, "latest"] }),
    cache: "no-store",
  });
  const j = await res.json();
  if (j.error || typeof j.result !== "string") throw new Error("rpc");
  return BigInt(j.result === "0x" ? "0x0" : j.result);
}

export function formatUnits(v: bigint, decimals = 6, places = 2) {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").slice(0, places);
  return `${whole.toString()}.${frac}`;
}
