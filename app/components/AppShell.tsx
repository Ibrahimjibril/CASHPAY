"use client";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Icon from "./Icons";
import { Wave } from "./Charts";
import { useI18n } from "@/lib/i18n";
import { ago, usd } from "@/lib/ui";

const NAV = [
  { href: "/dashboard", key: "nav_overview", icon: "home" },
  { href: "/send", key: "nav_send", icon: "send" },
  { href: "/send/bulk", key: "nav_bulk", icon: "users" },
  { href: "/tips", key: "nav_tips", icon: "heart" },
  { href: "/activity", key: "nav_tx", icon: "repeat" },
  { href: "/settings", key: "nav_settings", icon: "settings" },
];

type Notif = { id: string; kind: string; who: string; amount: number; ts: number; unread: boolean };
const TXT: Record<string, string> = { tipRecv: "nTipRecv", payRecv: "nPayRecv", tipClaimed: "nTipClaimed" };
const TONE: Record<string, string> = { tipRecv: "green", payRecv: "lav", tipClaimed: "blue" };
const ICON: Record<string, string> = { tipRecv: "send", payRecv: "download", tipClaimed: "check" };

export default function AppShell({ children }: { children: ReactNode; badge?: number }) {
  const { t } = useI18n();
  const path = usePathname();
  const { getAccessToken } = usePrivy();
  const tokRef = useRef(getAccessToken);
  tokRef.current = getAccessToken;

  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [results, setResults] = useState<{ username: string; display_name: string }[]>([]);
  const [nOpen, setNOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    try { setLight(localStorage.getItem("cp-theme") === "light"); } catch {}
  }, []);

  function toggle() {
    const n = !light;
    setLight(n);
    try { localStorage.setItem("cp-theme", n ? "light" : "dark"); } catch {}
  }

  const loadNotifs = useCallback(async () => {
    try {
      const token = await tokRef.current();
      const r = await fetch("/api/notifications", { headers: { authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items || []);
      setUnread(d.unread || 0);
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifs();
    const id = setInterval(loadNotifs, 60000);
    return () => clearInterval(id);
  }, [loadNotifs]);

  async function markAll() {
    setItems((v) => v.map((n) => ({ ...n, unread: false })));
    setUnread(0);
    try {
      const token = await tokRef.current();
      await fetch("/api/notifications/read", { method: "POST", headers: { authorization: `Bearer ${token}` } });
    } catch {}
  }

  useEffect(() => {
    const s = q.trim().replace(/^@/, "");
    if (s.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const token = await tokRef.current();
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(s)}`, { headers: { authorization: `Bearer ${token}` } });
        const d = await r.json();
        setResults(d.users || []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className={`cp-root${light ? " cp-light" : ""}`}>
      {open && <div className="cp-overlay" onClick={() => setOpen(false)} />}
      <aside className={`cp-side${open ? " open" : ""}`}>
        <Link className="cp-logo" href="/dashboard" onClick={() => setOpen(false)}><img src="/logo.svg" alt="" />CashPay</Link>
        <nav className="cp-nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""} onClick={() => setOpen(false)}>
              <Icon name={n.icon} />{t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="cp-promo">
          <div className="cp-ic green" style={{ marginBottom: 14 }}><Icon name="zap" /></div>
          <b className="t1">{t("promo1")}</b>
          <b className="t2">{t("promo2")} ◆</b>
          <p>{t("promoText")}</p>
          <Link className="cp-btn primary" href="/tips">{t("learnMore")} <Icon name="arrowR" size={16} /></Link>
          <Wave />
        </div>
      </aside>
      <div className="cp-main">
        <header className="cp-top">
          <button className="cp-iconbtn cp-menu" aria-label="Menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <div className="cp-search">
            <span className="ico"><Icon name="search" size={18} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 200)} placeholder={t("searchPh")} autoCapitalize="none" />
            {focus && results.length > 0 && (
              <div className="cp-drop">
                {results.map((u) => (
                  <Link key={u.username} href={`/u/${u.username}`}><b>{u.display_name}</b> <span className="cp-muted">@{u.username}</span></Link>
                ))}
              </div>
            )}
          </div>
          <div className="grow" />
          <button className="cp-iconbtn" aria-label={t("notifTitle")} onClick={() => { const n = !nOpen; setNOpen(n); if (n) loadNotifs(); }}>
            <Icon name="bell" />
            {unread > 0 && <span className="cp-badge">{unread > 9 ? "9+" : unread}</span>}
          </button>
          <button className="cp-iconbtn" aria-label="Toggle theme" onClick={toggle}><Icon name="moon" /></button>
          <a className="cp-pill cp-hide-sm" href="https://explore.mainnet.tempo.xyz" target="_blank" rel="noreferrer">
            <img src="/tempo-icon.svg" alt="" width={20} height={20} style={{ borderRadius: 6 }} />{t("tempoNet")}<Icon name="chevR" size={16} />
          </a>

          {nOpen && (
            <>
              <div className="cp-clickaway" onClick={() => setNOpen(false)} />
              <div className="cp-notif">
                <div className="cp-nh">
                  <b>{t("notifTitle")}</b>
                  {unread > 0 && <button className="cp-link" onClick={markAll}>{t("markRead")}</button>}
                </div>
                {items.length === 0 && <p className="cp-muted" style={{ padding: 16, margin: 0 }}>{t("noNotif")}</p>}
                {items.map((n) => (
                  <Link key={n.id} href="/activity" className={`cp-n${n.unread ? " unread" : ""}`} onClick={() => setNOpen(false)}>
                    <span className={`cp-ic sm ${TONE[n.kind]}`}><Icon name={ICON[n.kind]} size={16} /></span>
                    <span className="tx">{t(TXT[n.kind], { who: n.who, amt: usd(n.amount) })}</span>
                    <span className="tm">{ago(n.ts, t)}</span>
                    {n.unread && <span className="dot" />}
                  </Link>
                ))}
                <Link className="cp-nf" href="/activity" onClick={() => setNOpen(false)}>{t("viewAll")}</Link>
              </div>
            </>
          )}
        </header>
        <div className="cp-content">{children}</div>
      </div>
    </div>
  );
}
