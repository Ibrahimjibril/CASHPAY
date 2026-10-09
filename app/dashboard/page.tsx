"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import AppShell from "../components/AppShell";
import Icon from "../components/Icons";
import Loader from "../components/Loader";
import { LineChart, Spark, Wave } from "../components/Charts";
import { ago, shortAddr, usd } from "@/lib/ui";
import { useI18n } from "@/lib/i18n";

type Stat = { value: number; change: number };
type Data = {
  profile: { username: string; displayName: string; wallet: string };
  explorerUrl: string;
  badge: number;
  stats: { users: Stat; balance: Stat; tips: Stat; tx: Stat };
  spark: { users: number[]; balance: number[]; tips: number[]; tx: number[] };
  series: { label: string; value: number }[];
  txs: { id: string; code: string; who: string; amount: number; status: string; ts: number; tone: string; icon: string }[];
};

const TYPE: Record<string, string> = { tipRecv: "tTipRecv", payRecv: "tPayRecv", tipSent: "tTipSent", paySent: "tPaySent", claimed: "tClaimed", wallet: "tWallet" };
const ST: Record<string, string> = { CONFIRMED: "stDone", SUBMITTED: "stPend", FAILED: "stFail" };

function StatCard({ tone, icon, label, value, change, spark, color, id, since }: { tone: string; icon: string; label: string; value: string; change: number; spark: number[]; color: string; id: string; since: string }) {
  const up = change >= 0;
  return (
    <div className={`cp-stat ${tone}`}>
      <div className="top">
        <div className="cp-ic"><Icon name={icon} size={26} /></div>
        <div>
          <div className="lab">{label} <Icon name="info" size={14} /></div>
          <div className="val">{value}</div>
          <div className={`chg${up ? "" : " neg"}`}><Icon name={up ? "arrowUp" : "arrowDown"} size={14} />{up ? "+" : ""}{change}%</div>
          <div className="since">{since}</div>
        </div>
      </div>
      <Spark data={spark} color={color} id={id} />
    </div>
  );
}

function SettingsTile({ label, title, sub }: { label: string; title: string; sub: string }) {
  return (
    <Link className="cp-stat orange" href="/settings">
      <div className="top">
        <div className="cp-ic"><Icon name="settings" size={26} /></div>
        <div>
          <div className="lab">{label}</div>
          <div className="val">{title}</div>
          <div className="chg" style={{ color: "#ffd9a0" }}><Icon name="arrowR" size={14} /></div>
          <div className="since">{sub}</div>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [needs, setNeeds] = useState(false);
  const [err, setErr] = useState("");
  const [range, setRange] = useState(7);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const c = sessionStorage.getItem("cp-dash");
      if (c) setData(JSON.parse(c));
    } catch {}
  }, []);

  async function load() {
    setErr("");
    try {
      const token = await getAccessToken();
      const r = await fetch("/api/dashboard", { headers: { authorization: `Bearer ${token}` } });
      if (r.status === 404) { setNeeds(true); setData(null); return; }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNeeds(false);
      setData(d);
      try { sessionStorage.setItem("cp-dash", JSON.stringify(d)); } catch {}
    } catch {
      setErr(t("dashErr"));
    }
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  useEffect(() => {
    const u = username.trim().replace(/^@/, "").toLowerCase();
    if (!u) { setStatus(""); return; }
    const timer = setTimeout(async () => {
      const r = await fetch(`/api/username?u=${encodeURIComponent(u)}`);
      const d = await r.json();
      setStatus(!d.valid ? "Use 3–20 letters, numbers or _" : d.available ? "✓ Available" : "Already taken");
    }, 350);
    return () => clearTimeout(timer);
  }, [username]);

  async function save() {
    setBusy(true);
    const token = await getAccessToken();
    const r = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, displayName: name, bio }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setStatus(d.error || "Something went wrong. Please try again."); return; }
    setNeeds(false);
    load();
  }

  if (needs && ready && authenticated) {
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

  if (!data) {
    if (err) return <main className="wrap center"><p className="small">{err}</p><button className="btn primary" onClick={load}>{t("retry")}</button></main>;
    return <Loader />;
  }

  const d = data;
  const wallet = d.profile.wallet;
  const first = d.profile.displayName.split(" ")[0] || d.profile.displayName;
  const since = t("last7d");

  return (
    <AppShell badge={d.badge}>
      <div className="cp-welcome">
        <div>
          <h1>{t("welcome")} <span>{first}</span> 👋</h1>
          <p>{t("welcomeSub")}</p>
        </div>
        <div className="cp-wrow">
          {wallet && (
            <div className="cp-wallet">
              <Icon name="wallet" size={26} />
              <div><small>{t("walletAddr")}</small><b>{shortAddr(wallet)}</b></div>
              <button aria-label="Copy" onClick={() => { navigator.clipboard.writeText(wallet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                <Icon name={copied ? "check" : "copy"} size={16} />
              </button>
              <button aria-label="Refresh" onClick={load}><Icon name="refresh" size={16} /></button>
            </div>
          )}
          <a className="cp-pill" href={d.explorerUrl} target="_blank" rel="noreferrer">
            <Icon name="zap" size={16} />{t("tempoNet")}<Icon name="chevR" size={16} />
          </a>
        </div>
      </div>

      {err && <div className="cp-panel" style={{ marginBottom: 14 }}>{err} <button className="cp-btn" onClick={load}>{t("retry")}</button></div>}

      <div className="cp-hero">
        <StatCard tone="indigo" icon="wallet" label={t("statBalance")} value={`$${usd(d.stats.balance.value)}`} change={d.stats.balance.change} spark={d.spark.balance} color="#7f9bff" id="sg2" since={since} />
        <div className="cp-panel cp-qpanel">
          <div className="cp-ph"><h2>{t("quick")}</h2></div>
          <div className="cp-qa three">
            <Link className="cp-q g" href="/send"><span className="arr"><Icon name="arrowR" size={16} /></span><span className="cp-ic green"><Icon name="send" /></span><b>{t("qSend")}</b><span className="s">{t("qSendS")}</span></Link>
            <Link className="cp-q p" href="/tips"><span className="arr"><Icon name="arrowR" size={16} /></span><span className="cp-ic purple"><Icon name="userPlus" /></span><b>{t("qTip")}</b><span className="s">{t("qTipS")}</span></Link>
            <Link className="cp-q b" href="/send/bulk"><span className="arr"><Icon name="arrowR" size={16} /></span><span className="cp-ic blue"><Icon name="users" /></span><b>{t("qBulk")}</b><span className="s">{t("qBulkS")}</span></Link>
          </div>
        </div>
      </div>

      <div className="cp-stats" style={{ marginBottom: 14 }}>
        <StatCard tone="green" icon="users" label={t("statUsers")} value={d.stats.users.value.toLocaleString("en-US")} change={d.stats.users.change} spark={d.spark.users} color="#19e3a5" id="sg1" since={since} />
        <StatCard tone="blue" icon="send" label={t("statTips")} value={`$${usd(d.stats.tips.value)}`} change={d.stats.tips.change} spark={d.spark.tips} color="#58b0ff" id="sg3" since={since} />
        <StatCard tone="violet" icon="repeat" label={t("statTx")} value={d.stats.tx.value.toLocaleString("en-US")} change={d.stats.tx.change} spark={d.spark.tx} color="#a394ff" id="sg4" since={since} />
        <SettingsTile label={t("sProfile")} title={t("qSet")} sub={t("qSetS")} />
      </div>

      <div className="cp-left">
        <div className="cp-panel">
          <div className="cp-ph">
            <div>
              <h2><Icon name="wallet" size={22} /> {t("balOverview")}</h2>
              <div className="sub">{t("balSub", { n: range })}</div>
            </div>
            <select className="cp-select" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Range">
              <option value={7}>{t("range7")}</option>
              <option value={14}>{t("range14")}</option>
              <option value={30}>{t("range30")}</option>
            </select>
          </div>
          <LineChart points={d.series.slice(-range)} />
        </div>

        <div className="cp-banner">
          <span className="cp-ic green"><Icon name="zap" /></span>
          <p>{t("banner")}</p>
          <span className="heart"><Icon name="heart" size={26} /></span>
          <Wave />
        </div>

        <div className="cp-panel">
          <div className="cp-ph">
            <h2><Icon name="repeat" size={22} /> {t("recentTx")}</h2>
            <Link href="/activity">{t("viewAll")} <Icon name="arrowR" size={14} /></Link>
          </div>
          <div className="cp-tr cp-th"><div>{t("colType")}</div><div className="u">{t("colUser")}</div><div>{t("colAmount")}</div><div>{t("colStatus")}</div><div className="t">{t("colTime")}</div></div>
          {d.txs.length === 0 && <p className="cp-muted">{t("noActivity")}</p>}
          {d.txs.map((x) => {
            const sk = ST[x.status] || "stRev";
            return (
              <div className="cp-tr" key={x.id}>
                <div className="ty">
                  <span className={`cp-ic sm ${x.tone}`}><Icon name={x.icon} size={16} /></span>
                  <span><b>{t(TYPE[x.code])}</b><span className="usub">{x.who}</span></span>
                </div>
                <div className="u">{x.who}</div>
                <div className={x.amount >= 0 ? "pos" : "neg"}>{x.amount >= 0 ? "+" : "-"}${usd(Math.abs(x.amount))}</div>
                <div><span className={`cp-st ${sk === "stDone" ? "ok" : sk === "stPend" ? "wait" : "bad"}`}>{t(sk)}</span></div>
                <div className="t cp-muted">{ago(x.ts, t)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
