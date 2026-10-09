export type Token = { symbol: string; name: string; sub: string; address: string; decimals: number };

// All TIP-20 addresses on Tempo mainnet start with 0x20c0 and end with an 8-byte token id.
const A = (id: string) => "0x20c0" + "0".repeat(20) + id;

export const TOKENS: Token[] = [
  { symbol: "USDT", name: "Tether USD", sub: "USDT0 on Tempo", address: A("14f22ca97301eb73"), decimals: 6 },
  { symbol: "USDC", name: "USD Coin", sub: "USDC.e (bridged) on Tempo", address: A("b9537d11c60e8b50"), decimals: 6 },
  { symbol: "OUSD", name: "Open USD", sub: "Recommended on Tempo", address: A("6a37da5c996874be"), decimals: 6 },
];

export const DEFAULT_TOKEN = "OUSD";
export const tokenBySymbol = (s?: string | null) => TOKENS.find((t) => t.symbol === s) || null;
export const tokenByAddress = (a?: string | null) =>
  TOKENS.find((t) => t.address.toLowerCase() === String(a || "").toLowerCase()) || null;
export const symbolOf = (a?: string | null) => tokenByAddress(a)?.symbol || "USD";
