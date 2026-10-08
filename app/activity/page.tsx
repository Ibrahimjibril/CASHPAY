"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

type Item = {
  id: string; direction: "sent" | "received"; amount: string; memo: string | null; status: string;
  txHash: string; createdAt: string; fromLabel: string; toLabel: string; recipientEmail: string | null; claimable: boolean; claimStatus: string | null;
};

const fmt = (a: string) => Number(a).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const STATUS: Record<string, string> = { CONFIRMED: "✓ Completed", SUBMITTED: "Confirming…", MISMATCH: "Needs review", FAILED: "Failed" };

export default function Activity() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [explorer, setExplorer] = useState("");
  const [sel, setSel] = useState<Item | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function api(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    api("/api/activity").then((r) => r.json()).then((d) => { setItems(d.items || []); setExplorer(d.explorer || ""); }).catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  async function resend() {
    if (!sel) return;
    setBusy(true);
    setNote("");
    try {
      const r = await api("/api/payments/resend", { method: "POST", body: JSON.stringify({ id: sel.id }) });
      const d = await r.json();
      setNote(d.ok ? "✓ Email sent." : `Couldn't send the email: ${d.error || "unknown error"}`);
    } catch {
      setNote("Couldn't send the email. Please try again.");
    }
    setBusy(false);
  }

  function copyLink() {
    if (!sel) return;
    navigator.clipboard.writeText(`${window.location.origin}/claim/${sel.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!ready || !authenticated || items === null) return <main className="wrap center"><p className="small">Loading…</p></main>;

  if (sel) {
    const sent = sel.direction === "sent";
    return (
      <main className="wrap center">
        <div className="receipt">
          <div className="brand" style={{ justifyContent: "center" }}><img src="/logo.svg" alt="" />CashPay</div>
          <p className="small">Payment receipt</p>
          <div className="amt">${fmt(sel.amount)}</div>
          <p className="ok">{STATUS[sel.status] || sel.status}</p>
          <div className="kv"><span>From</span><b>{sent ? `You (${sel.fromLabel})` : sel.fromLabel}</b></div>
          <div className="kv"><span>To</span><b>{sent ? sel.toLabel : "You"}</b></div>
          {sel.memo && <div className="kv"><span>Message</span><b>“{sel.memo}”</b></div>}
          <div className="kv"><span>Date</span><b>{new Date(sel.createdAt).toLocaleString()}</b></div>
          <div className="kv"><span>Asset</span><b>OUSD</b></div>
          <div className="kv"><span>Network</span><b>Tempo</b></div>
          {sel.claimable && <div className="kv"><span>Claim</span><b>{sel.claimStatus === "CLAIMED" ? "✓ Claimed" : "Waiting to be claimed"}</b></div>}
          <div className="kv"><span>Transaction</span><b>{sel.txHash.slice(0, 10)}…{sel.txHash.slice(-6)}</b></div>
        </div>
        <p className="small">Tip: take a screenshot of this receipt to share it as proof of payment.</p>
        <div className="cta">
          {explorer && <a className="btn" href={`${explorer}/tx/${sel.txHash}`} target="_blank" rel="noreferrer">View on Explorer</a>}
          {sent && sel.claimable && <button className="btn" onClick={copyLink}>{copied ? "Copied ✓" : "Copy claim link"}</button>}
          {sent && sel.status === "CONFIRMED" && (!sel.claimable || !!sel.recipientEmail) && <button className="btn" disabled={busy} onClick={resend}>{busy ? "Sending…" : "Resend email"}</button>}
        </div>
        {note && <p className="small">{note}</p>}
        <button className="btn primary" onClick={() => { setSel(null); setNote(""); }}>Back to activity</button>
      </main>
    );
  }

  return (
    <main className="wrap center">
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>
      <h1 className="h-sm">Activity</h1>
      {items.length === 0 && <p className="lead">Your payment activity will appear here.</p>}
      <div className="list">
        {items.map((it) => (
          <button key={it.id} className="act" onClick={() => setSel(it)}>
            <span>
              <b>{it.direction === "sent" ? `To ${it.toLabel}` : `From ${it.fromLabel}`}</b>
              <span className="small" style={{ display: "block" }}>
                {new Date(it.createdAt).toLocaleDateString()} · {STATUS[it.status] || it.status}
              </span>
            </span>
            <span className={it.direction === "received" ? "plus" : "minus"}>
              {it.direction === "received" ? "+" : "−"}${fmt(it.amount)}
            </span>
          </button>
        ))}
      </div>
      <a className="btn primary" href="/dashboard">Back to dashboard</a>
    </main>
  );
}
