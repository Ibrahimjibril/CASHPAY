import { ImageResponse } from "next/og";

export const alt = "CashPay — Money for the social internet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #07162a 0%, #06101d 60%, #0a2a2a 100%)", color: "#ffffff" }}>
        <div style={{ position: "absolute", right: -160, top: -180, width: 640, height: 640, borderRadius: 320, background: "rgba(14,124,102,0.45)", display: "flex" }} />
        <div style={{ position: "absolute", left: -120, bottom: -200, width: 420, height: 420, borderRadius: 210, background: "rgba(30,90,200,0.18)", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: "0 80px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="128" height="128" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="16" fill="#0E7C66" />
              <path d="M42 22.5A14 14 0 1 0 42 41.5" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
              <circle cx="46" cy="32" r="4.5" fill="#FFD66B" />
            </svg>
            <div style={{ display: "flex", fontSize: 120, fontWeight: 800, marginLeft: 28 }}>
              <span>Cash</span>
              <span style={{ color: "#19e3a5" }}>Pay</span>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, marginTop: 34, color: "#d6e8e2" }}>Money for the social internet.</div>
          <div style={{ display: "flex", fontSize: 32, marginTop: 14, color: "#8ba2b6" }}>Send money. Just like sending a message.</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 44 }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800, padding: "14px 30px", borderRadius: 999, background: "rgba(25,227,165,0.14)", border: "2px solid rgba(25,227,165,0.7)", color: "#ffffff" }}>Powered by Tempo</div>
            <div style={{ display: "flex", fontSize: 28, marginLeft: 26, color: "#8ba2b6" }}>www.cashpayt.xyz</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
