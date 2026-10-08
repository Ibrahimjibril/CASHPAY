"use client";
import { useEffect, useState } from "react";

type Data = { total: string; tokens: { symbol: string; display: string }[]; explorerUrl: string | null };

export default function Balance({ getToken }: { getToken: () => Promise<string | null> }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const token = await getToken();
      const r = await fetch("/api/balance", { headers: { authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch {
      setErr("Tempo is taking longer than expected. Please try again.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty = data && Number(data.total) === 0;
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="small">Balance</div>
      <div className="amt">${data ? data.total : "0.00"}</div>
      {empty && <p className="small">Your wallet is ready. Funds you receive will show here.</p>}
      {err && <p className="small">{err}</p>}
      <div className="cta" style={{ marginTop: 10 }}>
        <button className="btn" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        {data?.explorerUrl && <a className="btn" href={data.explorerUrl} target="_blank" rel="noreferrer">View on Explorer</a>}
      </div>
    </div>
  );
}
