export function ago(v: string | number | Date) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(v).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function usd(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
