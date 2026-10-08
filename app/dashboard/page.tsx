"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import AppShell from "../components/AppShell";
import Icon from "../components/Icons";
import { LineChart, Spark, Wave } from "../components/Charts";
import { ago, shortAddr, usd } from "@/lib/ui";

type Profile = { username: string; display_name: string; bio: string | null; wallet_address: string | null };
type Stat = { value: number; change: number };
type Data = {
  profile: { username: string; displayName: string; wallet: string };
  explorerUrl: string;
  badge: number;
  stats: { users: Stat; balance: Stat; tips: Stat; tx: Stat };
  spark: { users: number[]; balance: number[]; tips: number[]; tx: number[] };
  series: { label: string; value: number }[];
  events: { id: string; title: string; amt: string | null; text: string; ts: number; tone: string; icon: string }[];
  txs: { id: string; type: string; who: string; amount: number; status: string; ts: number; tone: string; icon: string }[];
};

function StatCard({ tone, icon, label, value, change, spark, color, id }: { tone: string; icon: string; label: string; value: string; change: number; spark: number[]; color: string; id: string }) {
  const up = change >= 0;
  return (
    <div className={`cp-stat ${tone}`}>
      <div className="top">
        <div className="cp-ic"><Icon name={icon} size={26} /></div>
        <div>
          <div className="lab">{label} <Icon name="info" size={14} /></div>
          <div className="val">{value}</div>
          <div className={`chg${up ? "" : " neg"}`}><Icon name={up ? "arrowUp" : "arrowDown"} size={14} />{up ? "+" : ""}{change}%</div>
          <div className="since">from last 7 days</div>
        </div>
      </div>
      <Spark data={spark} color={color} id={id} />
    </div>
  );
}

function greetingName(n: string) {
  return n.split(" ")[0] || n;
}

export default function Dashboard() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [range, setRange] = useState(7);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function api(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
  }

  async function loadData() {
    setErr("");
    try {
      const r = await api("/api/dashboard");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch {
      setErr("We couldn't load your dashboard. Please try again.");
    }
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    api("/api/profile")
      .then((r) => r.json())
      .then((d) => { setProfile(d.profile); setLoaded(true); if (d.profile) loadData(); })
      .catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  useEffect(() => {
    const u = username.trim().replace(/^@/, "").toLowerCase();
    if (!u) { setStatus(""); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/username?u=${encodeURIComponent(u)}`);
      const d = await r.json();
      setStatus(!d.valid ? "Use 3–20 letters, numbers or _" : d.available ? "✓ Available" : "Already taken");
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  async function save() {
    setBusy(true);
    const r = await api("/api/profile", { method: "POST", body: JSON.stringify({ username, displayName: name, bio }) });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setStatus(d.error || "Something went wrong. Please try again."); return; }
    setProfile(d.profile);
    loadData();
  }

  if (!ready || !authenticated || !loaded) return <main className="wrap center"><p className="small">Loading…</p></main>;

  if (!profile) {
    return (
      <main className="wrap center">
        <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
        <h1 className="h-sm">Choose your username</h1>
        <p className="lead">This is how people will find and pay you.</p>
        <div className="form">
          <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@john" autoCapitalize="none" /></label>
          <div className="small">{status}</div>
          <label>Display name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" maxLength={50} /></label>
          <label>Bio (optional)<input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Building the future." maxLength={160} /></label>
          <button className="btn primary" disabled={busy || !username || !name} onClick={save}>{busy ? "Saving…" : "Continue"}</button>
        </div>
      </main>
    );
  }

  const d = data;
  const wallet = d?.profile.wallet || profile.wallet_address || "";
  const first = greetingName(d?.profile.displayName || profile.display_name);

  return (
    <AppShell badge={d?.badge || 0}>
      <div className="cp-welcome">
        <div>
          <h1>Welcome back, <span>{first}</span> 👋</h1>
          <p>Here&apos;s what&apos;s happening with your CashPay account.</p>
        </div>
        <div className="cp-wrow">
          {wallet && (
            <div className="cp-wallet">
              <Icon name="wallet" size={26} />
              <div><small>Your Wallet Address</small><b>{shortAddr(wallet)}</b></div>
              <button aria-label="Copy address" onClick={() => { navigator.clipboard.writeText(wallet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                <Icon name={copied ? "check" : "copy"} size={16} />
              </button>
              <button aria-label="Refresh" onClick={loadData}><Icon name="refresh" size={16} /></button>
            </div>
          )}
          <a className="cp-pill" href={d?.explorerUrl || "https://explore.tempo.xyz"} target="_blank" rel="noreferrer">
            <Icon name="zap" size={16} />Tempo Network<Icon name="chevR" size={16} />
          </a>
        </div>
      </div>

      {err && <div className="cp-panel" style={{ marginBottom: 14 }}>{err} <button className="cp-btn" onClick={loadData}>Retry</button></div>}

      <div className="cp-stats">
        <StatCard tone="green" icon="users" label="Total Users" value={(d?.stats.users.value ?? 0).toLocaleString("en-US")} change={d?.stats.users.change ?? 0} spark={d?.spark.users ?? []} color="#19e3a5" id="sg1" />
        <StatCard tone="indigo" icon="wallet" label="Total Wallet Balance" value={`$${usd(d?.stats.balance.value ?? 0)}`} change={d?.stats.balance.change ?? 0} spark={d?.spark.balance ?? []} color="#7f9bff" id="sg2" />
        <StatCard tone="blue" icon="send" label="Total Tips Received" value={`$${usd(d?.stats.tips.value ?? 0)}`} change={d?.stats.tips.change ?? 0} spark={d?.spark.tips ?? []} color="#58b0ff" id="sg3" />
        <StatCard tone="violet" icon="repeat" label="Total Transactions" value={(d?.stats.tx.value ?? 0).toLocaleString("en-US")} change={d?.stats.tx.change ?? 0} spark={d?.spark.tx ?? []} color="#a394ff" id="sg4" />
      </div>

      <div className="cp-cols">
        <div className="cp-left">
          <div className="cp-panel">
            <div className="cp-ph">
              <div>
                <h2><Icon name="wallet" size={22} /> Wallet Balance Overview</h2>
                <div className="sub">Your wallet balance over the last {range} days</div>
              </div>
              <select className="cp-select" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Range">
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
            <LineChart points={(d?.series ?? []).slice(-range)} />
          </div>

          <div className="cp-sub">
            <div className="cp-panel">
              <div className="cp-ph">
                <h2><Icon name="repeat" size={22} /> Recent Transactions</h2>
                <Link href="/activity">View all <Icon name="arrowR" size={14} /></Link>
              </div>
              <div className="cp-tr cp-th"><div>Type</div><div className="u">User</div><div>Amount</div><div>Status</div><div className="t">Time</div></div>
              {(d?.txs ?? []).length === 0 && <p className="cp-muted">Your payment activity will appear here.</p>}
              {(d?.txs ?? []).map((t) => (
                <div className="cp-tr" key={t.id}>
                  <div className="ty">
                    <span className={`cp-ic sm ${t.tone}`}><Icon name={t.icon} size={16} /></span>
                    <span><b>{t.type}</b><span className="usub">{t.who}</span></span>
                  </div>
                  <div className="u">{t.who}</div>
                  <div className={t.amount >= 0 ? "pos" : "neg"}>{t.amount >= 0 ? "+" : "-"}${usd(Math.abs(t.amount))}</div>
                  <div><span className={`cp-st ${t.status === "Completed" ? "ok" : t.status === "Pending" ? "wait" : "bad"}`}>{t.status}</span></div>
                  <div className="t cp-muted">{ago(t.ts)}</div>
                </div>
              ))}
            </div>

            <div className="cp-panel">
              <div className="cp-ph"><h2>Quick Actions</h2></div>
              <div className="cp-qa">
                <Link className="cp-q g" href="/send"><span className="arr"><Icon name="arrowR" size={16} /></span><span className="cp-ic green"><Icon name="send" /></span><b>Send Money</b><span className="s">Quick &amp; easy transfer</span></Link>
                <Link className="cp-q b" href="/request"><span className="arr"><Icon name="arrowR" size={16} /></span><span className="cp-ic blue"><Icon name="upload" /></span><b>Request Payment</b><span className="s">Share your link</span></Link>
                <Link className="cp-q p" href="/tips"><span className="arr"><Icon name="arrowR" size={16} /></span><span className="cp-ic purple"><Icon name="userPlus" /></span><b>Tip Someone</b><span className="s">Support a creator</span></Link>
                <Link className="cp-q o" href="/settings"><span className="arr"><Icon name="arrowR" size={16} /></span><span className="cp-ic orange"><Icon name="settings" /></span><b>Settings</b><span className="s">Manage your app</span></Link>
              </div>
            </div>
          </div>
        </div>

        <div className="cp-right">
          <div className="cp-panel">
            <div className="cp-ph">
              <h2><Icon name="zap" size={22} /> Recent Activity</h2>
              <Link href="/activity">View all <Icon name="arrowR" size={14} /></Link>
            </div>
            {(d?.events ?? []).map((e) => (
              <div className="cp-act" key={e.id}>
                <span className={`cp-ic ${e.tone}`}><Icon name={e.icon} /></span>
                <div className="tx">
                  <b>{e.title}</b>
                  <div className="s">{e.amt && <span className="pos">{e.amt} </span>}{e.text}</div>
                </div>
                <span className="tm">{ago(e.ts)}</span>
              </div>
            ))}
          </div>
          <div className="cp-banner">
            <span className="cp-ic green"><Icon name="zap" /></span>
            <p>Your support powers creators and builds the social internet.</p>
            <span className="heart"><Icon name="heart" size={26} /></span>
            <Wave />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
