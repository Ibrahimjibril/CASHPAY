"use client";
import Balance from "./Balance";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

type Profile = { username: string; display_name: string; bio: string | null; wallet_address: string | null };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { ready, authenticated, logout, getAccessToken } = usePrivy();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function api(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(path, {
      ...init,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    });
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    api("/api/profile")
      .then((r) => r.json())
      .then((d) => { setProfile(d.profile); setLoaded(true); })
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

  const addr = profile.wallet_address;
  return (
    <main className="wrap">
      <nav className="nav">
        <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
        <button className="btn" onClick={logout}>Sign out</button>
      </nav>
      <h1 className="h-sm">{greeting()}, {profile.display_name.split(" ")[0]} 👋</h1>
      <div className="card">
        <div className="small">Your username</div>
        <h3>@{profile.username}</h3>
        <a className="small" href={`/u/${profile.username}`}>View public profile</a>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="small">CashPay Wallet</div>
        <h3>Your wallet is ready.</h3>
        {addr && (
          <button className="btn" onClick={() => { navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? "Copied ✓" : `${addr.slice(0, 6)}…${addr.slice(-4)} · Copy`}
          </button>
        )}
      </div>
      <Balance getToken={getAccessToken} />
      <div className="cta">
        <a className="btn primary" href="/send">Send</a>
        <a className="btn" href="/activity">Activity</a>
        <a className="btn" href="/send/bulk">Bulk send</a>
        <a className="btn" href="/request">Request</a>
        <a className="btn" href="/tips">Tip</a>
      </div>
    </main>
  );
}
