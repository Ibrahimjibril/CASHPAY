"use client";
import TokenIcon from "./TokenIcon";
import { TOKENS } from "@/lib/tokens";

const fmt = (v?: string) =>
  Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export default function TokenPicker({ value, onChange, balances }: { value: string; onChange: (s: string) => void; balances: Record<string, string> }) {
  return (
    <div style={{ width: "100%" }}>
      <div className="small" style={{ fontWeight: 600, marginBottom: 6, textAlign: "left" }}>Pay with</div>
      <div className="tokpick">
        {TOKENS.map((t) => (
          <button type="button" key={t.symbol} className={`tok${value === t.symbol ? " on" : ""}`} onClick={() => onChange(t.symbol)}>
            <TokenIcon symbol={t.symbol} size={30} />
            <b>{t.symbol}</b>
            <small>${fmt(balances[t.symbol])}</small>
          </button>
        ))}
      </div>
      <div className="small" style={{ marginTop: 6, textAlign: "left" }}>Available: ${fmt(balances[value])} {value}</div>
    </div>
  );
}
