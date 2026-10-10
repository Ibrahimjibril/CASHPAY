import { ImageResponse } from "next/og";
import { sql } from "@/lib/db";

export const alt = "CashPay tips";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  let total = "0.00";
  let n = 0;
  let from = "";
  let handles: string[] = [];
  if (/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    const rows = await sql`
      select p.amount, p.recipient_x, u.username
      from payments p join users u on u.id = p.sender_id
      where p.tx_hash = ${hash.toLowerCase()} order by p.leg`;
    if (rows.length) {
      total = rows.reduce((a: number, r: any) => a + Number(r.amount), 0).toFixed(2);
      n = rows.length;
      from = "From @" + rows[0].username;
      handles = rows.filter((r: any) => r.recipient_x).map((r: any) => "@" + r.recipient_x);
    }
  }
  const shown = handles.slice(0, 10);
  const more = handles.length - shown.length;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #07604f 0%, #0E7C66 55%, #13a384 100%)", color: "#ffffff" }}>
        <div style={{ position: "absolute", right: -140, top: -150, width: 540, height: 540, borderRadius: 270, background: "rgba(255,255,255,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", left: -90, bottom: -140, width: 300, height: 300, borderRadius: 150, background: "rgba(255,214,107,0.12)", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 54 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="68" height="68" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="16" fill="#ffffff" />
              <path d="M42 22.5A14 14 0 1 0 42 41.5" fill="none" stroke="#0E7C66" strokeWidth="7" strokeLinecap="round" />
              <circle cx="46" cy="32" r="4.5" fill="#F5B731" />
            </svg>
            <div style={{ display: "flex", fontSize: 42, fontWeight: 800, marginLeft: 18 }}>CashPay</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: 4, color: "#c9f5e6" }}>{`TIPS FOR ${n} PEOPLE`}</div>
            <div style={{ display: "flex", fontSize: 128, fontWeight: 800, lineHeight: 1.05 }}>{"$" + total}</div>
            <div style={{ display: "flex", fontSize: 32, marginBottom: 14 }}>{from}</div>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {shown.map((h) => (
                <div key={h} style={{ display: "flex", background: "rgba(255,255,255,0.18)", padding: "8px 18px", borderRadius: 999, fontSize: 26, fontWeight: 700, margin: "0 10px 10px 0" }}>{h}</div>
              ))}
              {more > 0 && <div style={{ display: "flex", background: "rgba(255,214,107,0.9)", color: "#0b1b17", padding: "8px 18px", borderRadius: 999, fontSize: 26, fontWeight: 800, margin: "0 10px 10px 0" }}>{`+${more} more`}</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", background: "#FFD66B", color: "#0b1b17", fontSize: 28, fontWeight: 800, padding: "12px 28px", borderRadius: 999 }}>Connect X to claim yours</div>
            <div style={{ display: "flex", fontSize: 26, opacity: 0.9 }}>Powered by Tempo</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
