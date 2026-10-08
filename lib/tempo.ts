export const TEMPO = {
  chainId: 4217,
  rpcUrl: process.env.TEMPO_RPC_URL || "https://rpc.tempo.xyz",
  explorer: process.env.TEMPO_EXPLORER_URL || "https://explore.tempo.xyz",
};

// TIP-20 stablecoins CashPay shows. All TIP-20 tokens use 6 decimals.
export const TOKENS = [
  { symbol: "OUSD", address: "0x20c0" + "0".repeat(20) + "6a37da5c996874be", decimals: 6 },
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

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getReceipt(hash: string): Promise<any | null> {
  const res = await fetch(TEMPO.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [hash] }),
    cache: "no-store",
  });
  const j = await res.json();
  return j.result ?? null;
}

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topicAddr = (t: string) => "0x" + t.slice(26).toLowerCase();

export function matchesTransfer(receipt: any, token: string, from: string, to: string, amount: bigint) {
  const logs: any[] = Array.isArray(receipt?.logs) ? receipt.logs : [];
  return logs.some(
    (l) =>
      String(l.address).toLowerCase() === token.toLowerCase() &&
      l.topics?.[0] === TRANSFER_TOPIC &&
      l.topics.length >= 3 &&
      topicAddr(l.topics[1]) === from.toLowerCase() &&
      topicAddr(l.topics[2]) === to.toLowerCase() &&
      BigInt(l.data && l.data !== "0x" ? l.data : "0x0") === amount
  );
}
