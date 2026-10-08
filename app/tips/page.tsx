"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

type Person = { username: string; display_name: string; wallet_address: string };
const PRESETS = ["5", "10", "20", "50"];

export default function Tips() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Person | null>(null);
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
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    const t = setTimeout(async () => {
      const r = await api(`/api/users/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      setResults(d.users || []);
      setSearched(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!ready || !authenticated) return <main className="wrap center"><p className="small">Loading…</p></main>;

  const inviteText = `I want to tip @${q} on CashPay 💸 Join here:`;
  return (
    <main className="wrap center">
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>
      <h1 className="h-sm">Tip someone you appreciate</h1>
      <div className="form">
        {picked ? (
          <div className="card">
            <b>{picked.display_name}</b> <span className="small">@{picked.username}</span>
            <div><button className="btn" onClick={() => setPicked(null)}>Change</button></div>
          </div>
        ) : (
          <>
            <label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="@username" autoCapitalize="none" /></label>
            {results.map((p) => (
              <button key={p.username} className="btn" onClick={() => setPicked(p)}>{p.display_name} · @{p.username}</button>
            ))}
            {searched && results.length === 0 && (
              <div className="card">
                <p className="small">@{q} isn't on CashPay yet. Invite them, so you can tip them once they join.</p>
                <a className="btn" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(inviteText)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}>Invite on X</a>
              </div>
            )}
          </>
        )}
        <label>Amount ($)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <div className="chips" style={{ marginTop: 0 }}>
          {PRESETS.map((v) => <button key={v} className="chip" onClick={() => setAmount(v)}>${v}</button>)}
        </div>
        <button className="btn primary" disabled={!picked || !amount}
          onClick={() => picked && router.push(`/send?u=${encodeURIComponent(picked.username)}&amount=${encodeURIComponent(amount)}&memo=${encodeURIComponent("Tip 💸")}`)}>
          Send tip
        </button>
      </div>
    </main>
  );
}
