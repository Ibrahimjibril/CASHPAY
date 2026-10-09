import { ImageResponse } from "next/og";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  let amount = "0.00";
  let label = "YOU RECEIVED MONEY";
  let from = "";
  let memo = "";
  if (/^[0-9a-fA-F-]{36}$/.test(id)) {
    const rows = await sql`
      select p.amount, p.memo, p.recipient_x, u.username
      from payments p join users u on u.id = p.sender_id
      where p.id = ${id}`;
    const p = rows[0];
    if (p) {
      amount = Number(p.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
      label = p.recipient_x ? "TIP FOR @" + String(p.recipient_x).toUpperCase() : "YOU RECEIVED MONEY";
      from = "From @" + p.username;
      memo = p.memo ? "“" + String(p.memo).slice(0, 60) + "”" : "";
    }
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #07604f 0%, #0E7C66 55%, #13a384 100%)", color: "#ffffff" }}>
        <div style={{ position: "absolute", right: -140, top: -150, width: 560, height: 560, borderRadius: 280, background: "rgba(255,255,255,0.08)", display: "flex" }} />
        <div style={{ position: "absolute", right: 120, bottom: -210, width: 420, height: 420, borderRadius: 210, background: "rgba(0,0,0,0.12)", display: "flex" }} />
        <div style={{ position: "absolute", left: -90, bottom: -120, width: 300, height: 300, borderRadius: 150, background: "rgba(255,214,107,0.12)", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 60 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="76" height="76" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="16" fill="#ffffff" />
              <path d="M42 22.5A14 14 0 1 0 42 41.5" fill="none" stroke="#0E7C66" strokeWidth="7" strokeLinecap="round" />
              <circle cx="46" cy="32" r="4.5" fill="#F5B731" />
            </svg>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, marginLeft: 20 }}>CashPay</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 5, color: "#c9f5e6" }}>{label}</div>
            <div style={{ display: "flex", fontSize: 176, fontWeight: 800, lineHeight: 1.05 }}>{"$" + amount}</div>
            <div style={{ display: "flex", fontSize: 38 }}>{from}</div>
            <div style={{ display: "flex", fontSize: 30, opacity: 0.85, marginTop: 6 }}>{memo}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", background: "#FFD66B", color: "#0b1b17", fontSize: 30, fontWeight: 800, padding: "14px 30px", borderRadius: 999 }}>Claim it in seconds</div>
            <div style={{ display: "flex", fontSize: 28, opacity: 0.9 }}>Powered by Tempo</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 600, headers: { "cache-control": "public, max-age=3600" } }
  );
}
