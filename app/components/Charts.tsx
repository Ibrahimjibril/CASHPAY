function smooth(xy: number[][]) {
  if (!xy.length) return "";
  let d = `M${xy[0][0].toFixed(1)} ${xy[0][1].toFixed(1)}`;
  for (let i = 1; i < xy.length; i++) {
    const cx = (xy[i - 1][0] + xy[i][0]) / 2;
    d += ` C${cx.toFixed(1)} ${xy[i - 1][1].toFixed(1)} ${cx.toFixed(1)} ${xy[i][1].toFixed(1)} ${xy[i][0].toFixed(1)} ${xy[i][1].toFixed(1)}`;
  }
  return d;
}

export function Spark({ data, color, id }: { data: number[]; color: string; id: string }) {
  const W = 220, H = 70;
  const pts = data.length > 1 ? data : [0, 0];
  const min = Math.min(...pts), max = Math.max(...pts);
  const span = max - min || 1;
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, max === min ? H * 0.62 : H - 8 - ((v - min) / span) * (H - 24)]);
  const line = smooth(xy);
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return (
    <svg className="cp-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function niceMax(max: number) {
  if (max <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

export function LineChart({ points }: { points: { label: string; value: number }[] }) {
  const W = 620, H = 260, L = 58, R = 18, T = 16, B = 38;
  const n = points.length;
  const top = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const x = (i: number) => (n <= 1 ? L : L + (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const xy = points.map((p, i) => [x(i), y(p.value)]);
  const line = smooth(xy);
  const base = y(0);
  const area = xy.length ? `${line} L${xy[xy.length - 1][0]} ${base} L${xy[0][0]} ${base} Z` : "";
  const ticks = [0, 1, 2, 3, 4].map((k) => (top * k) / 4);
  const step = Math.max(1, Math.ceil(n / 7));
  const fmt = (v: number) => "$" + (top < 10 ? v.toFixed(2) : String(Math.round(v)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Wallet balance chart">
      <defs>
        <linearGradient id="cpArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#19e3a5" stopOpacity=".45" />
          <stop offset="100%" stopColor="#19e3a5" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="cp-grid" />
          <text x={L - 10} y={y(t) + 4} textAnchor="end" className="cp-ax">{fmt(t)}</text>
        </g>
      ))}
      {area && <path d={area} fill="url(#cpArea)" />}
      {line && <path d={line} fill="none" stroke="#19e3a5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {xy.map((p, i) => (<circle key={i} cx={p[0]} cy={p[1]} r="4.5" fill="#19e3a5" className="cp-dot" />))}
      {points.map((p, i) => (i % step === 0 || i === n - 1) ? (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className="cp-ax">{p.label}</text>
      ) : null)}
    </svg>
  );
}

export function Wave() {
  return (
    <svg className="cp-wave" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 45 C40 30 80 50 120 38 S200 20 240 32 S320 40 400 14 L400 60 L0 60Z" fill="rgba(25,227,165,.16)" />
      <path d="M0 45 C40 30 80 50 120 38 S200 20 240 32 S320 40 400 14" fill="none" stroke="#19e3a5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
