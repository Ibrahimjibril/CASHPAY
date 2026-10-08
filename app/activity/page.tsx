"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import AppShell from "../components/AppShell";
import Icon from "../components/Icons";
import { ago, usd } from "@/lib/ui";

type Item = {
  id: string; direction: "sent" | "received"; amount: string; memo: string | null; status: string;
  txHash: string; createdAt: string; fromLabel: string; toLabel: string; recipientEmail: string | null;
  claimable: boolean; claimStatus: string | null;
};
type Filter = "all" | "received" | "sent" | "tips";

const isTip = (i: Item) => (i.memo || "").startsWith("Tip");
const typeOf = (i: Item) => (i.direction === "received" ? (isTip(i) ? "Tip received" : "Payment received") : isTip(i) ? "Tip sent" : "Payment sent");
const toneOf = (i: Item) => (i.direction === "received" ? (isTip(i) ? "green" : "lav") : isTip(i) ? "blue" : "red");
const iconOf = (i: Item) => (isTip(i) ? "send" : i.direction === "received" ? "download" : "upload");
const whoOf = (i: Item) => (i.direction === "received" ? i.fromLabel : i.toLabel);
const statusOf = (s: string) => (s === "CONFIRMED" ? "Completed" : s === "SUBMITTED" ? "Pending" : s === "FAILED" ? "Failed" : "Review");
const stClass = (s: string) => (s === "Completed" ? "ok" : s === "Pending" ? "wait" : "bad");

export default function Activity() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [explorer, setExplorer] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
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

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (items || []).filter((i) => {
      if (filter === "received" && i.direction !== "received") return false;
      if (filter === "sent" && i.direction !== "sent") return false;
      if (filter === "tips" && !isTip(i)) return false;
      if (!s) return true;
      return `${typeOf(i)} ${whoOf(i)} ${i.memo || ""} ${statusOf(i.status)}`.toLowerCase().includes(s);
    });
  }, [items, filter, search]);

  async function resend() {
    if (!sel) return;
    setBusy(true);
    setNote("");
    try {
      const r = await api("/api/payments/resend", { method: "POST", body: JSON.stringify({ id: sel.id }) });
      const d = await r.json();
      setNote(d.ok ? "✓ Email sent." : `Couldn't send the email: ${d.error || "unknown error"}`);
    } catch { setNote("Couldn't send the email. Please try again."); }
    setBusy(false);
  }

  function copyLink() {
    if (!sel) return;
    navigator.clipboard.writeText(`${window.location.origin}/claim/${sel.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!ready || !authenticated || items === null) return <main className="wrap center"><p className="small">Loading…</p></main>;

  const sent = sel?.direction === "sent";
  return (
    <AppShell>
      <div className="cp-welcome">
        <div>
          <h1>Transaction <span>History</span></h1>
          <p>Everything you sent and received on CashPay.</p>
        </div>
      </div>

      <div className="cp-panel">
        <div className="cp-tabs">
          {([["all", "All"], ["received", "Received"], ["sent", "Sent"], ["tips", "Tips"]] as [Filter, string][]).map(([k, l]) => (
            <button key={k} className={`cp-tab${filter === k ? " on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <input style={{ width: "100%", height: 44, padding: "0 14px", marginBottom: 12 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…" />

        <div className="cp-tr cp-th"><div>Type</div><div className="u">User</div><div>Amount</div><div>Status</div><div className="t">Time</div></div>
        {shown.length === 0 && <p className="cp-muted">Your payment activity will appear here.</p>}
        {shown.map((i) => {
          const st = statusOf(i.status);
          const plus = i.direction === "received";
          return (
            <div className="cp-tr cp-row" key={i.id} onClick={() => { setSel(i); setNote(""); }}>
              <div className="ty">
                <span className={`cp-ic sm ${toneOf(i)}`}><Icon name={iconOf(i)} size={16} /></span>
                <span><b>{typeOf(i)}</b><span className="usub">{whoOf(i)}</span></span>
              </div>
              <div className="u">{whoOf(i)}</div>
              <div className={plus ? "pos" : "neg"}>{plus ? "+" : "-"}${usd(Number(i.amount))}</div>
              <div><span className={`cp-st ${stClass(st)}`}>{st}</span></div>
              <div className="t cp-muted">{ago(i.createdAt)}</div>
            </div>
          );
        })}
      </div>

      {sel && (
        <div className="cp-modal-bg" onClick={() => setSel(null)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 18 }}>Payment receipt</b>
              <button className="cp-iconbtn" aria-label="Close" onClick={() => setSel(null)}><Icon name="close" /></button>
            </div>
            <div className="cp-amt">{sel.direction === "received" ? "+" : "-"}${usd(Number(sel.amount))}</div>
            <span className={`cp-st ${stClass(statusOf(sel.status))}`}>{statusOf(sel.status)}</span>
            <div style={{ marginTop: 14 }}>
              <div className="cp-kv"><span>Type</span><b>{typeOf(sel)}</b></div>
              <div className="cp-kv"><span>From</span><b>{sent ? `You (${sel.fromLabel})` : sel.fromLabel}</b></div>
              <div className="cp-kv"><span>To</span><b>{sent ? sel.toLabel : "You"}</b></div>
              {sel.memo && <div className="cp-kv"><span>Message</span><b>“{sel.memo}”</b></div>}
              <div className="cp-kv"><span>Date</span><b>{new Date(sel.createdAt).toLocaleString()}</b></div>
              <div className="cp-kv"><span>Asset</span><b>OUSD</b></div>
              <div className="cp-kv"><span>Network</span><b>Tempo</b></div>
              {sel.claimable && <div className="cp-kv"><span>Claim</span><b>{sel.claimStatus === "CLAIMED" ? "✓ Claimed" : "Waiting to be claimed"}</b></div>}
              <div className="cp-kv"><span>Transaction</span><b>{sel.txHash.slice(0, 10)}...{sel.txHash.slice(-6)}</b></div>
            </div>
            <p className="cp-muted" style={{ fontSize: 13 }}>Tip: take a screenshot of this receipt to share it as proof of payment.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {explorer && <a className="cp-btn" href={`${explorer}/tx/${sel.txHash}`} target="_blank" rel="noreferrer">View on Explorer</a>}
              {sent && sel.claimable && <button className="cp-btn" onClick={copyLink}>{copied ? "Copied ✓" : "Copy claim link"}</button>}
              {sent && sel.status === "CONFIRMED" && (!sel.claimable || !!sel.recipientEmail) && <button className="cp-btn" disabled={busy} onClick={resend}>{busy ? "Sending…" : "Resend email"}</button>}
            </div>
            {note && <p className="cp-muted" style={{ fontSize: 13 }}>{note}</p>}
          </div>
        </div>
      )}
    </AppShell>
  );
}
