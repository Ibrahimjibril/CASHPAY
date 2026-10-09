export default function TokenIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const c = { width: size, height: size, viewBox: "0 0 32 32", "aria-hidden": true } as const;
  if (symbol === "USDC")
    return (
      <svg {...c}>
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <path d="M10.2 6.9a11 11 0 0 0 0 18.2" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M21.8 6.9a11 11 0 0 1 0 18.2" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
        <text x="16" y="21.4" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">$</text>
      </svg>
    );
  if (symbol === "USDT")
    return (
      <svg {...c}>
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <rect x="8" y="8.2" width="16" height="3.4" rx="0.8" fill="#fff" />
        <rect x="14.2" y="11" width="3.6" height="12.8" rx="0.8" fill="#fff" />
        <ellipse cx="16" cy="16.2" rx="7.4" ry="2" fill="none" stroke="#fff" strokeWidth="1.5" />
      </svg>
    );
  if (symbol === "OUSD")
    return (
      <svg {...c}>
        <circle cx="16" cy="16" r="16" fill="#0E7C66" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="#fff" strokeWidth="3.2" />
        <circle cx="22.8" cy="9.2" r="2.2" fill="#FFD66B" />
      </svg>
    );
  return (
    <svg {...c}>
      <circle cx="16" cy="16" r="16" fill="#64748b" />
      <text x="16" y="21" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">$</text>
    </svg>
  );
}
