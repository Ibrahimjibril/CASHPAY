const FILES: Record<string, string> = { USDT: "usdt", USDC: "usdc", OUSD: "ousd", pathUSD: "pathusd" };

export default function TokenIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const f = FILES[symbol];
  if (f) {
    return <img src={`/tokens/${f}.svg`} width={size} height={size} alt={symbol} style={{ borderRadius: "50%", display: "block", flex: "none" }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#64748b" />
      <text x="16" y="21" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">$</text>
    </svg>
  );
}
