"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Loader from "@/app/components/Loader";
import Avatar from "@/app/components/Avatar";
import XAvatar from "@/app/components/XAvatar";
import { maxSendable, parseUnits6 } from "@/lib/money";

type Person = { username: string; display_name: string; wallet_address: string };
type XRes = { id: string; username: string; name: string; avatar: string; verified: boolean; cashpay: string | null };
type Picked =
  | { kind: "cashpay"; username: string; name: string }
  | { kind: "x"; x: XRes; confirmed: boolean }
  | { kind: "handle"; handle: string };

const PRESETS = ["5", "10", "20", "50"];
const HANDLE = /^[a-zA-Z0-9_]{1,15}$/;

export default function Tips() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [xres, setXres] = useState<XRes[]>([]);
  const [xnote, setXnote] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [amount, setAmount] = useState("5");
  const [maxBal, setMaxBal] = useState("0");

  async function api(path: string) {
    const token = await getAccessToken();
    return fetch(path, { headers: { authorization: `Bearer ${token}` } });
  }

  useEffect(() => {
    if (ready && !authenticated) router.replace("/login");
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    api("/api/balance").then((r) => r.json()).then((d) => {
      let best = BigInt(0);
      let bs = "0";
      for (const x of d.tokens || []) { const u = parseUnits6(x.balance) ?? BigInt(0); if (u > best) { best = u; bs = x.balance; } }
      setMaxBal(bs);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  const q = query.trim().replace(/^@/, "");
  useEffect(() => {
    if (q.length < 2) { setPeople([]); setXres([]); setXnote(""); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const [a, b] = await Promise.all([
          api(`/api/users/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => ({})),
          api(`/api/x/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => ({})),
        ]);
        setPeople(a.users || []);
        setXres(b.users || []);
        setXnote(b.error || (b.exactOnly && (b.users || []).length === 0 ? "No exact match. Type the full @username." : ""));
      } catch { setXnote("We couldn't search right now."); }
      setBusy(false);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function go() {
    if (!picked) return;
    const memo = encodeURIComponent("Tip 💸");
    const amt = encodeURIComponent(amount);
    if (picked.kind === "cashpay") router.push(`/send?u=${encodeURIComponent(picked.username)}&amount=${amt}&memo=${memo}`);
    else if (picked.kind === "x") router.push(`/send?xid=${encodeURIComponent(picked.x.id)}&amount=${amt}&memo=${memo}`);
    else router.push(`/send?x=${encodeURIComponent(picked.handle)}&amount=${amt}&memo=${memo}`);
  }

  if (!ready || !authenticated) return <Loader />;

  const canSend = !!picked && (picked.kind !== "x" || picked.confirmed) && !!amount;

  return (
    <main className="wrap center">
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>
      <h1 className="h-sm">Tip someone you appreciate</h1>
      <div className="form">
        {picked ? (
          <div className="card">
            {picked.kind === "cashpay" && (
              <div className="xconfirm">
                <Avatar username={picked.username} name={picked.name} size={48} />
                <span><b>@{picked.username}</b><span className="small" style={{ display: "block" }}>{picked.name} · on CashPay</span></span>
              </div>
            )}
            {picked.kind === "x" && (
              <>
                <div className="xconfirm">
                  <XAvatar src={picked.x.avatar} size={56} />
                  <span>
                    <b>{picked.x.name}</b>
                    <span className="small" style={{ display: "block" }}>@{picked.x.username}{picked.x.cashpay ? " · on CashPay" : " · not on CashPay yet"}</span>
                  </span>
                </div>
                {!picked.confirmed ? (
                  <>
                    <p className="small">Is this the right account? Check the photo and name before you continue.</p>
                    <div className="cta" style={{ justifyContent: "flex-start" }}>
                      <button className="btn primary" onClick={() => setPicked({ ...picked, confirmed: true })}>Yes, this is them</button>
                      <a className="btn" href={`https://x.com/${picked.x.username}`} target="_blank" rel="noreferrer">View on X</a>
                      <button className="btn" onClick={() => setPicked(null)}>Change</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="small">✓ Account confirmed. {picked.x.cashpay ? "The tip goes straight to their CashPay wallet." : "They'll claim it by signing in with X."}</p>
                    <button className="btn" onClick={() => setPicked(null)}>Change</button>
                  </>
                )}
              </>
            )}
            {picked.kind === "handle" && (
              <>
                <b>@{picked.handle}</b>
                <p className="small">We couldn't verify this account, so double-check the spelling. The tip can only be claimed by the account with exactly this username.</p>
                <button className="btn" onClick={() => setPicked(null)}>Change</button>
              </>
            )}
          </div>
        ) : (
          <>
            <label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="X name or @username" autoCapitalize="none" /></label>
            {busy && <p className="small">Searching…</p>}

            {people.length > 0 && <div className="small" style={{ fontWeight: 700 }}>On CashPay</div>}
            {people.map((p) => (
              <button type="button" key={p.username} className="xr" onClick={() => setPicked({ kind: "cashpay", username: p.username, name: p.display_name })}>
                <Avatar username={p.username} name={p.display_name} size={44} />
                <span><b>{p.display_name}</b><small>@{p.username}</small></span>
              </button>
            ))}

            {xres.length > 0 && <div className="small" style={{ fontWeight: 700 }}>X accounts</div>}
            {xres.map((u) => (
              <button type="button" key={u.id} className="xr" onClick={() => setPicked({ kind: "x", x: u, confirmed: false })}>
                <XAvatar src={u.avatar} size={44} />
                <span><b>{u.name}</b><small>@{u.username}</small></span>
                {u.cashpay && <span className="tag">On CashPay</span>}
              </button>
            ))}

            {xnote && <p className="small">{xnote}</p>}
            {xnote && HANDLE.test(q) && xres.length === 0 && (
              <button type="button" className="btn" onClick={() => setPicked({ kind: "handle", handle: q.toLowerCase() })}>Use @{q} without verification</button>
            )}
          </>
        )}

        <label>Amount ($)
          <div className="amtrow">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button type="button" className="maxbtn" onClick={() => setAmount(maxSendable(maxBal))}>Max</button>
          </div>
        </label>
        <div className="chips" style={{ marginTop: 0 }}>
          {PRESETS.map((v) => <button key={v} className="chip" onClick={() => setAmount(v)}>${v}</button>)}
        </div>
        <button className="btn primary" disabled={!canSend} onClick={go}>Send tip</button>
      </div>
    </main>
  );
}
