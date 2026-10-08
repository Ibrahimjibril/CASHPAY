"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import AppShell from "../components/AppShell";
import Icon from "../components/Icons";

export default function Settings() {
  const { ready, authenticated, getAccessToken, logout } = usePrivy();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    (async () => {
      const token = await getAccessToken();
      const r = await fetch("/api/profile", { headers: { authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.profile) router.replace("/dashboard"); else setP(d.profile);
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  if (!ready || !authenticated || !p) return <main className="wrap center"><p className="small">Loading…</p></main>;

  const addr: string = p.wallet_address || "";
  return (
    <AppShell>
      <div className="cp-welcome">
        <div>
          <h1>Your <span>Settings</span></h1>
          <p>Manage your profile and wallet.</p>
        </div>
      </div>

      <div className="cp-sub" style={{ marginBottom: 14 }}>
        <div className="cp-panel">
          <div className="cp-ph"><h2>Profile</h2></div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="cp-ic green" style={{ width: 64, height: 64, borderRadius: "50%", fontSize: 26, fontWeight: 800 }}>{String(p.display_name).charAt(0).toUpperCase()}</span>
            <div>
              <b style={{ fontSize: 18 }}>{p.display_name}</b>
              <div className="cp-muted">@{p.username}</div>
              {p.bio && <div className="cp-muted" style={{ marginTop: 4 }}>{p.bio}</div>}
            </div>
          </div>
          <div style={{ marginTop: 16 }}><a className="cp-btn" href={`/u/${p.username}`}>View public profile</a></div>
        </div>

        <div className="cp-panel">
          <div className="cp-ph"><h2>Wallet</h2></div>
          <div className="cp-kv"><span>Address</span><b style={{ fontSize: 13 }}>{addr || "Not ready yet"}</b></div>
          <div className="cp-kv"><span>Network</span><b>Tempo Mainnet</b></div>
          <div className="cp-kv"><span>Asset</span><b>OUSD</b></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {addr && (
              <button className="cp-btn" onClick={() => { navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                <Icon name={copied ? "check" : "copy"} size={16} />{copied ? "Copied" : "Copy address"}
              </button>
            )}
            {addr && <a className="cp-btn" href={`https://explore.tempo.xyz/address/${addr}`} target="_blank" rel="noreferrer">View on Explorer</a>}
          </div>
        </div>
      </div>

      <div className="cp-panel">
        <div className="cp-ph"><h2>Account</h2></div>
        <p className="cp-muted" style={{ marginTop: 0 }}>Your wallet keys are managed securely by Privy. CashPay never sees your private keys.</p>
        <button className="cp-btn ghost" onClick={async () => { await logout(); router.replace("/"); }}><Icon name="logout" size={16} />Sign out</button>
      </div>
    </AppShell>
  );
}
