"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

type Req = { id: string; amount: string; memo: string | null; status: string };
const fmt = (a: string) => Number(a).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });

export default function RequestMoney() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [items, setItems] = useState<Req[]>([]);
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function api(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
  }
  async function load() {
    const r = await api("/api/requests");
    const d = await r.json();
    setItems(d.items || []);
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  async function create() {
    setBusy(true);
    setMsg("");
    try {
      const r = await api("/api/requests", { method: "POST", body: JSON.stringify({ amount, memo }) });
      const d = await r.json();
      if (!r.ok) setMsg(d.error || "Something went wrong.");
      else { setLink(`${window.location.origin}/request/${d.id}`); load(); }
    } catch { setMsg("Something went wrong. Please try again."); }
    setBusy(false);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!ready || !authenticated) return <main className="wrap center"><p className="small">Loading…</p></main>;

  const text = `Please pay me $${amount}${memo ? ` for ${memo}` : ""} on CashPay:`;
  return (
    <main className="wrap center">
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>
      <h1 className="h-sm">Request money</h1>
      {link ? (
        <div className="card" style={{ width: "100%", textAlign: "left" }}>
          <b>Your request is ready.</b>
          <p className="small" style={{ wordBreak: "break-all" }}>{link}</p>
          <div className="cta">
            <button className="btn" onClick={() => copy(link)}>{copied ? "Copied ✓" : "Copy link"}</button>
            <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text + " " + link)}`}>WhatsApp</a>
            <a className="btn" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`}>Share on X</a>
            <button className="btn primary" onClick={() => { setLink(""); setAmount(""); setMemo(""); }}>New request</button>
          </div>
        </div>
      ) : (
        <div className="form">
          <label>Amount ($)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50.00" /></label>
          <label>Message (optional)<input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={140} placeholder="Dinner" /></label>
          {msg && <p className="small">{msg}</p>}
          <button className="btn primary" disabled={busy || !amount} onClick={create}>{busy ? "Creating…" : "Create request link"}</button>
        </div>
      )}
      {items.length > 0 && <h2 className="h-sm">Your requests</h2>}
      <div className="list">
        {items.map((it) => (
          <div key={it.id} className="act" style={{ cursor: "default" }}>
            <span><b>${fmt(it.amount)}</b>{it.memo && <span className="small" style={{ display: "block" }}>{it.memo}</span>}</span>
            <span className={it.status === "PAID" ? "plus" : "small"}>{it.status === "PAID" ? "✓ Paid" : "Waiting"}</span>
          </div>
        ))}
      </div>
      <a className="btn" href="/dashboard">Back to dashboard</a>
    </main>
  );
}
