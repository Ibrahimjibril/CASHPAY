import { ImageResponse } from "next/og";
import { sql } from "@/lib/db";

export const alt = "CashPay payment";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let amount = "0.00";
  let label = "YOU RECEIVED MONEY";
  let from = "";
  let memo = "";
  if (/^[0-9a-fA-F-]{36}$/.test(id)) {
    const rows = await sql`select p.amount, p.memo, p.recipient_x, u.username from payments p join users u on u.id = p.sender_id where p.id = ${id}`;
    const p = rows[0];
    if (p) {
      amount = Number(p.amount).toFixed(2);
      label = p.recipient_x ? "TIP FOR @" + String(p.recipient_x).toUpperCase() : "YOU RECEIVED MONEY";
      from = "From @" + p.username;
      memo = p.memo ? "“" + p.memo + "”" : "";
    }
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0E7C66", color: "#ffffff", padding: 64 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 72, height: 72, borderRadius: 20, background: "#ffffff", color: "#0E7C66", fontSize: 52, fontWeight: 900, alignItems: "center", justifyContent: "center" }}>C</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, marginLeft: 20 }}>CashPay</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 4 }}>{label}</div>
          <div style={{ display: "flex", fontSize: 200, fontWeight: 900, lineHeight: 1.05 }}>{"$" + amount}</div>
          <div style={{ display: "flex", fontSize: 40 }}>{from}</div>
          <div style={{ display: "flex", fontSize: 34, opacity: 0.85, marginTop: 8 }}>{memo}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", background: "#FFD66B", color: "#0b1b17", fontSize: 32, fontWeight: 800, padding: "14px 28px", borderRadius: 999 }}>Claim it in seconds</div>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.9 }}>Powered by Tempo</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
