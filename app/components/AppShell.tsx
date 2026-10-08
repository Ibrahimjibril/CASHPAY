"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Icon from "./Icons";
import { Wave } from "./Charts";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/send", label: "Send Money", icon: "send" },
  { href: "/send/bulk", label: "Bulk Send", icon: "users" },
  { href: "/request", label: "Request", icon: "upload" },
  { href: "/tips", label: "Tips", icon: "heart" },
  { href: "/activity", label: "Transactions", icon: "repeat" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export default function AppShell({ children, badge = 0 }: { children: ReactNode; badge?: number }) {
  const path = usePathname();
  const { getAccessToken } = usePrivy();
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [results, setResults] = useState<{ username: string; display_name: string }[]>([]);

  useEffect(() => {
    try { setLight(localStorage.getItem("cp-theme") === "light"); } catch {}
  }, []);

  function toggle() {
    const n = !light;
    setLight(n);
    try { localStorage.setItem("cp-theme", n ? "light" : "dark"); } catch {}
  }

  useEffect(() => {
    const s = q.trim().replace(/^@/, "");
    if (s.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const token = await getAccessToken();
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(s)}`, { headers: { authorization: `Bearer ${token}` } });
        const d = await r.json();
        setResults(d.users || []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={`cp-root${light ? " cp-light" : ""}`}>
      {open && <div className="cp-overlay" onClick={() => setOpen(false)} />}
      <aside className={`cp-side${open ? " open" : ""}`}>
        <Link className="cp-logo" href="/dashboard" onClick={() => setOpen(false)}><img src="/logo.svg" alt="" />CashPay</Link>
        <nav className="cp-nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? "active" : ""} onClick={() => setOpen(false)}>
              <Icon name={n.icon} />{n.label}
            </Link>
          ))}
        </nav>
        <div className="cp-promo">
          <div className="cp-ic green" style={{ marginBottom: 14 }}><Icon name="zap" /></div>
          <b className="t1">Join the</b>
          <b className="t2">Social Economy ◆</b>
          <p>Get tipped. Support creators. Be part of CashPay.</p>
          <Link className="cp-btn primary" href="/tips">Learn More <Icon name="arrowR" size={16} /></Link>
          <Wave />
        </div>
      </aside>
      <div className="cp-main">
        <header className="cp-top">
          <button className="cp-iconbtn cp-menu" aria-label="Menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <div className="cp-search">
            <span className="ico"><Icon name="search" size={18} /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 200)} placeholder="Search users, @username, or transactions..." autoCapitalize="none" />
            {focus && results.length > 0 && (
              <div className="cp-drop">
                {results.map((u) => (
                  <Link key={u.username} href={`/u/${u.username}`}><b>{u.display_name}</b> <span className="cp-muted">@{u.username}</span></Link>
                ))}
              </div>
            )}
          </div>
          <div className="grow" />
          <Link className="cp-iconbtn" href="/activity" aria-label="Notifications">
            <Icon name="bell" />
            {badge > 0 && <span className="cp-badge">{badge > 9 ? "9+" : badge}</span>}
          </Link>
          <button className="cp-iconbtn" aria-label="Toggle theme" onClick={toggle}><Icon name="moon" /></button>
          <a className="cp-pill cp-hide-sm" href="https://explore.tempo.xyz" target="_blank" rel="noreferrer">
            <Icon name="zap" size={16} />Tempo Network<Icon name="chevR" size={16} />
          </a>
        </header>
        <div className="cp-content">{children}</div>
      </div>
    </div>
  );
}
