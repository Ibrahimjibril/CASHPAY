"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import AppShell from "../components/AppShell";
import Icon from "../components/Icons";
import Loader from "../components/Loader";
import { ago, usd } from "@/lib/ui";
import { useI18n } from "@/lib/i18n";

type Item = {
  id: string; direction: "sent" | "received"; amount: string; memo: string | null; status: string;
  txHash: string; createdAt: string; fromLabel: string; toLabel: string; recipientEmail: string | null;
  claimable: boolean; claimStatus: string | null;
};
type Filter = "all" | "received" | "sent" | "tips";

const isTip = (i: Item) => (i.memo || "").startsWith("Tip");
const typeKey = (i: Item) => (i.direction === "received" ? (isTip(i) ? "tTipRecv" : "tPayRecv") : isTip(i) ? "tTipSent" : "tPaySent");
const toneOf = (i: Item) => (i.direction === "received" ? (isTip(i) ? "green" : "lav") : isTip(i) ? "blue" : "red");
const iconOf = (i: Item) => (isTip(i) ? "send" : i.direction === "received" ? "download" : "upload");
const whoOf = (i: Item) => (i.direction === "received" ? i.fromLabel : i.toLabel);
const stKey = (s: string) => (s === "CONFIRMED" ? "stDone" : s === "SUBMITTED" ? "stPend" : s === "FAILED" ? "stFail" : "stRev");
const stClass = (k: string) => (k === "stDone" ? "ok" : k === "stPend" ? "wait" : "bad");

export default function Activity() {
  const { t } = useI18n();
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

  useEffect(() => {
    try {
      const c = sessionStorage.getItem("cp-act");
      if (c) { const o = JSON.parse(c); setItems(o.items); setExplorer(o.explorer); }
    } catch {}
  }, []);

  async function api(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    api("/api/activity").then((r) => r.json()).then((d) => {
      setItems(d.items || []);
      setExplorer(d.explorer || "");
      try { sessionStorage.setItem("cp-act", JSON.stringify({ items: d.items || [], explorer: d.explorer || "" })); } catch {}
    }).catch(() => setItems((v) => v || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (items || []).filter((i) => {
      if (filter === "received" && i.direction !== "received") return false;
      if (filter === "sent" && i.direction !== "sent") return false;
      if (filter === "tips" && !isTip(i)) return false;
      if (!s) return true;
      return `${t(typeKey(i))} ${whoOf(i)} ${i.memo || ""} ${t(stKey(i.status))}`.toLowerCase().includes(s);
    });
  }, [items, filter, search, t]);

  async function resend() {
    if (!sel) return;
    setBusy(true);
    setNote("");
    try {
      const r = await api("/api/payments/resend", { method: "POST", body: JSON.stringify({ id: sel.id }) });
      const d = await r.json();
      setNote(d.ok ? t("rEmailOk") : `${t("rEmailFail")} ${d.error || ""}`);
    } catch { setNote(t("rEmailFail")); }
    setBusy(false);
  }

  function copyLink() {
    if (!sel) return;
    navigator.clipboard.writeText(`${window.location.origin}/claim/${sel.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (items === null) return <Loader />;

  const sent = sel?.direction === "sent";
  return (
    <AppShell>
      <div className="cp-welcome">
        <div>
          <h1>{t("thA")} <span>{t("thB")}</span></h1>
          <p>{t("thSub")}</p>
        </div>
      </div>

      <div className="cp-panel">
        <div className="cp-tabs">
          {([["all", "fAll"], ["received", "fRecv"], ["sent", "fSent"], ["tips", "fTips"]] as [Filter, string][]).map(([k, l]) => (
            <button key={k} className={`cp-tab${filter === k ? " on" : ""}`} onClick={() => setFilter(k)}>{t(l)}</button>
          ))}
        </div>
        <input style={{ width: "100%", height: 44, padding: "0 14px", marginBottom: 12 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchTx")} />

        <div className="cp-tr cp-th"><div>{t("colType")}</div><div className="u">{t("colUser")}</div><div>{t("colAmount")}</div><div>{t("colStatus")}</div><div className="t">{t("colTime")}</div></div>
        {shown.length === 0 && <p className="cp-muted">{t("noActivity")}</p>}
        {shown.map((i) => {
          const sk = stKey(i.status);
          const plus = i.direction === "received";
          return (
            <div className="cp-tr cp-row" key={i.id} onClick={() => { setSel(i); setNote(""); }}>
              <div className="ty">
                <span className={`cp-ic sm ${toneOf(i)}`}><Icon name={iconOf(i)} size={16} /></span>
                <span><b>{t(typeKey(i))}</b><span className="usub">{whoOf(i)}</span></span>
              </div>
              <div className="u">{whoOf(i)}</div>
              <div className={plus ? "pos" : "neg"}>{plus ? "+" : "-"}${usd(Number(i.amount))}</div>
              <div><span className={`cp-st ${stClass(sk)}`}>{t(sk)}</span></div>
              <div className="t cp-muted">{ago(i.createdAt, t)}</div>
            </div>
          );
        })}
      </div>

      {sel && (
        <div className="cp-modal-bg" onClick={() => setSel(null)}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 18 }}>{t("rcpt")}</b>
              <button className="cp-iconbtn" aria-label="Close" onClick={() => setSel(null)}><Icon name="close" /></button>
            </div>
            <div className="cp-amt">{sel.direction === "received" ? "+" : "-"}${usd(Number(sel.amount))}</div>
            <span className={`cp-st ${stClass(stKey(sel.status))}`}>{t(stKey(sel.status))}</span>
            <div style={{ marginTop: 14 }}>
              <div className="cp-kv"><span>{t("rType")}</span><b>{t(typeKey(sel))}</b></div>
              <div className="cp-kv"><span>{t("rFrom")}</span><b>{sent ? `${t("rYou")} (${sel.fromLabel})` : sel.fromLabel}</b></div>
              <div className="cp-kv"><span>{t("rTo")}</span><b>{sent ? sel.toLabel : t("rYou")}</b></div>
              {sel.memo && <div className="cp-kv"><span>{t("rMsg")}</span><b>“{sel.memo}”</b></div>}
              <div className="cp-kv"><span>{t("rDate")}</span><b>{new Date(sel.createdAt).toLocaleString()}</b></div>
              <div className="cp-kv"><span>{t("rAsset")}</span><b>OUSD</b></div>
              <div className="cp-kv"><span>{t("rNet")}</span><b>Tempo</b></div>
              {sel.claimable && <div className="cp-kv"><span>{t("rClaim")}</span><b>{sel.claimStatus === "CLAIMED" ? t("rClaimed") : t("rWaiting")}</b></div>}
              <div className="cp-kv"><span>{t("rTx")}</span><b>{sel.txHash.slice(0, 10)}...{sel.txHash.slice(-6)}</b></div>
            </div>
            <p className="cp-muted" style={{ fontSize: 13 }}>{t("rTip")}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {explorer && <a className="cp-btn" href={`${explorer}/tx/${sel.txHash}`} target="_blank" rel="noreferrer">{t("rExplorer")}</a>}
              {sent && sel.claimable && <button className="cp-btn" onClick={copyLink}>{copied ? t("rCopied") : t("rCopyLink")}</button>}
              {sent && sel.status === "CONFIRMED" && (!sel.claimable || !!sel.recipientEmail) && <button className="cp-btn" disabled={busy} onClick={resend}>{busy ? t("rSending") : t("rResend")}</button>}
            </div>
            {note && <p className="cp-muted" style={{ fontSize: 13 }}>{note}</p>}
          </div>
        </div>
      )}
    </AppShell>
  );
}
