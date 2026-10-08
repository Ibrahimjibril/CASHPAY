type Tr = (k: string, v?: Record<string, string | number>) => string;

export function ago(v: string | number | Date, t?: Tr) {
  const f = (k: string, n: number, fb: string) => (t ? t(k, { n }) : fb);
  const s = Math.max(1, Math.floor((Date.now() - new Date(v).getTime()) / 1000));
  if (s < 60) return f("agoS", s, `${s}s ago`);
  const m = Math.floor(s / 60);
  if (m < 60) return f("agoM", m, `${m}m ago`);
  const h = Math.floor(m / 60);
  if (h < 24) return f("agoH", h, `${h}h ago`);
  const d = Math.floor(h / 24);
  return d < 30 ? f("agoD", d, `${d}d ago`) : new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function usd(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
