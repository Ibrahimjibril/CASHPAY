"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import AppShell from "../components/AppShell";
import Icon from "../components/Icons";
import Loader from "../components/Loader";
import TokenIcon from "../components/TokenIcon";
import { ago, usd } from "@/lib/ui";
import { useI18n } from "@/lib/i18n";

type Tok = { symbol: string; name: string; sub: string; display: string };
type Item = { id: string; direction: "sent" | "received"; amount: string; status: string; fromLabel: string; toLabel: string; token: string; createdAt: string };

export default function WalletPage() {
  const { t } = useI18n();
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [total, setTotal] = useState("0.00");
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [explorer, setExplorer] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function api(path: string) {
    const token = await getAccessToken();
    return fetch(path, { headers: { authorization: `Bearer ${token}` } });
  }

  async function load() {
    const [p, b, a]: any[] = await Promise.all([
      api("/api/profile").then((r) => r.json()).catch(() => ({})),
      api("/api/balance").then((r) => r.json()).catch(() => ({})),
      api("/api/activity").then((r) => r.json()).catch(() => ({})),
    ]);
    if (p.profile === null) { router.replace("/dashboard"); return; }
    setAddress(p.profile?.wallet_address || "");
    setTotal(b.total ?? "0.00");
    setTokens(b.tokens || []);
    setItems((a.items || []).slice(0, 10));
    setExplorer(a.explorer || "");
    setLoaded(true);
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  if (!loaded) return <Loader />;

  return (
    <AppShell>
      <div className="cp-welcome">
        <div>
          <h1>My <span>{t("nav_wallet")}</span></h1>
          <p>Your money on Tempo, in one place.</p>
        </div>
        <button className="cp-btn" onClick={load}><Icon name="refresh" size={16} /> Refresh</button>
      </div>

      <div className="cp-panel">
        <div className="cp-muted" style={{ fontSize: 13 }}>Total balance</div>
        <div className="cp-amt" style={{ textAlign: "left" }}>${total}</div>
        <div className="cp-assets">
          {tokens.map((k) => (
            <div className="cp-asset" key={k.symbol}>
              <TokenIcon symbol={k.symbol} size={40} />
              <div className="nm"><b>{k.symbol}</b><span>{k.sub}</span></div>
              <b className="bl">${k.display}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="cp-panel" style={{ marginTop: 14 }}>
        <div className="cp-ph"><h2><Icon name="download" size={22} /> Receive</h2></div>
        <p className="cp-muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
          Send USDT, USDC, OUSD or pathUSD on the <b>Tempo</b> network to this address. Other networks are not supported.
        </p>
        <div className="wl-addr">{address || "—"}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {address && (
            <button className="cp-btn primary" onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Copied" : "Copy address"}
            </button>
          )}
          <Link className="cp-btn" href="/send">Send</Link>
          {address && explorer && <a className="cp-btn" href={`${explorer}/address/${address}`} target="_blank" rel="noreferrer">Explorer</a>}
        </div>
      </div>

      <div className="cp-panel" style={{ marginTop: 14 }}>
        <div className="cp-ph">
          <h2><Icon name="repeat" size={22} /> History</h2>
          <Link href="/activity">{t("viewAll")} <Icon name="arrowR" size={14} /></Link>
        </div>
        {items.length === 0 && <p className="cp-muted">{t("noActivity")}</p>}
        {items.map((i) => {
          const plus = i.direction === "received";
          return (
            <Link href="/activity" className="cp-act" key={i.id}>
              <span className={`cp-ic sm ${plus ? "green" : "red"}`}><Icon name={plus ? "download" : "upload"} size={16} /></span>
              <div className="tx">
                <b>{plus ? `From ${i.fromLabel}` : `To ${i.toLabel}`}</b>
                <div className="s">{i.token} · {ago(i.createdAt, t)}</div>
              </div>
              <span className={plus ? "pos" : "neg"}>{plus ? "+" : "-"}${usd(Number(i.amount))}</span>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
