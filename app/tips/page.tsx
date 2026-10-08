"use client";
import Loader from "@/app/components/Loader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

type Person = { username: string; display_name: string; wallet_address: string };
type Picked = { username?: string; display_name?: string; x?: string };
const PRESETS = ["5", "10", "20", "50"];
const HANDLE = /^[a-zA-Z0-9_]{1,15}$/;

export default function Tips() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [amount, setAmount] = useState("5");
  const [searched, setSearched] = useState(false);

  async function api(path: string) {
    const token = await getAccessToken();
    return fetch(path, { headers: { authorization: `Bearer ${token}` } });
  }

  useEffect(() => {
    if (ready && !authenticated) router.replace("/login");
  }, [ready, authenticated, router]);

  const q = query.trim().replace(/^@/, "");
  useEffect(() => {
    setSearched(false);
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await api(`/api/users/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults(d.users || []);
      setSearched(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function go() {
    if (!picked) return;
    const memo = encodeURIComponent("Tip 💸");
    const amt = encodeURIComponent(amount);
    if (picked.username) router.push(`/send?u=${encodeURIComponent(picked.username)}&amount=${amt}&memo=${memo}`);
    else if (picked.x) router.push(`/send?x=${encodeURIComponent(picked.x)}&amount=${amt}&memo=${memo}`);
  }

  if (!ready || !authenticated) return <Loader />;

  const label = picked ? `@${picked.username || picked.x}` : "";
  return (
    <main className="wrap center">
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>
      <h1 className="h-sm">Tip someone you appreciate</h1>
      <div className="form">
        {picked ? (
          <div className="card">
            <b>{label}</b> <span className="small">{picked.display_name ? `· ${picked.display_name}` : "· not on CashPay yet, they'll claim with X"}</span>
            <div><button className="btn" onClick={() => setPicked(null)}>Change</button></div>
          </div>
        ) : (
          <>
            <label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="@username" autoCapitalize="none" /></label>
            {results.map((p) => (
              <button key={p.username} className="btn" onClick={() => setPicked({ username: p.username, display_name: p.display_name })}>{p.display_name} · @{p.username}</button>
            ))}
            {searched && results.length === 0 && HANDLE.test(q) && (
              <div className="card">
                <b>@{q}</b>
                <p className="small">Not on CashPay yet. You can still tip them. They'll claim it by signing in with X.</p>
                <button className="btn primary" onClick={() => setPicked({ x: q.toLowerCase() })}>Tip @{q}</button>
              </div>
            )}
          </>
        )}
        <label>Amount ($)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <div className="chips" style={{ marginTop: 0 }}>
          {PRESETS.map((v) => <button key={v} className="chip" onClick={() => setAmount(v)}>${v}</button>)}
        </div>
        <button className="btn primary" disabled={!picked || !amount} onClick={go}>Send tip</button>
      </div>
    </main>
  );
}
