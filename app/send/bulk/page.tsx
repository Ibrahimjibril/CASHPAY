"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSendTransaction } from "@privy-io/react-auth/tempo";
import Loader from "@/app/components/Loader";
import TokenPicker from "@/app/components/TokenPicker";
import XAvatar from "@/app/components/XAvatar";
import { CHAIN_ID, parseUnits6, encodeTransfer, isAddress, maxSendable } from "@/lib/money";
import { tokenBySymbol } from "@/lib/tokens";
import { toSite } from "@/lib/site";
import { tweetChunks, tweetHref } from "@/lib/share";

type Kind = "user" | "email" | "x" | "wallet";
type Row = { label: string; kind: Kind; address: string; amount: string; units: bigint; email?: string; x?: string; escrowId?: string; avatar?: string; name?: string };
type XSel = { id: string; username: string; name: string; avatar: string; amount: string };
type XRes = { id: string; username: string; name: string; avatar: string; verified: boolean; cashpay: string | null };
type Result = { id: string; leg: number; status: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE = /^@?[a-zA-Z0-9_]{1,15}$/;
const KIND: Record<Kind, string> = { user: "CashPay", email: "Email · claim link", x: "X · claims with X", wallet: "Wallet" };
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const money = (u: bigint) => `${u / BigInt(1000000)}.${(u % BigInt(1000000)).toString().padStart(6, "0").slice(0, 2)}`;

export default function BulkSend() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const router = useRouter();

  const [me, setMe] = useState<{ wallet_address: string | null } | null>(null);
  const [bals, setBals] = useState<Record<string, string>>({});
  const [tok, setTok] = useState("OUSD");
  const [text, setText] = useState("");
  const [common, setCommon] = useState("");
  const [memo, setMemo] = useState("");
  const [step, setStep] = useState<"form" | "preparing" | "review" | "sending" | "done">("form");
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [explorer, setExplorer] = useState("");
  const [copied, setCopied] = useState(-1);
  const [batchHash, setBatchHash] = useState("");
  const [xq, setXq] = useState("");
  const [xRes, setXRes] = useState<XRes[]>([]);
  const [xNote, setXNote] = useState("");
  const [xBusy, setXBusy] = useState(false);
  const [xSel, setXSel] = useState<XSel[]>([]);

  async function api(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    api("/api/profile").then((r) => r.json()).then((d) => {
      if (!d.profile) router.replace("/dashboard"); else setMe(d.profile);
    });
    api("/api/balance").then((r) => r.json()).then((d) => {
      const m: Record<string, string> = {};
      let best = "OUSD";
      let hi = BigInt(-1);
      for (const x of d.tokens || []) {
        m[x.symbol] = x.balance;
        const u = parseUnits6(x.balance) ?? BigInt(0);
        if (u > hi) { hi = u; best = x.symbol; }
      }
      setBals(m);
      setTok(best);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  // X account search (official X API through our server)
  useEffect(() => {
    const s = xq.trim().replace(/^@/, "");
    if (s.length < 2) { setXRes([]); setXNote(""); return; }
    const t = setTimeout(async () => {
      setXBusy(true);
      try {
        const r = await api(`/api/x/search?q=${encodeURIComponent(s)}`);
        const d = await r.json();
        setXRes(d.users || []);
        setXNote(d.error || (d.exactOnly && (d.users || []).length === 0 ? "No exact match. Type the full @username." : d.exactOnly ? "Tip: type the full @username to find an account." : ""));
      } catch { setXRes([]); setXNote("We couldn't search X right now."); }
      setXBusy(false);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xq]);

  function addX(u: XRes) {
    if (xSel.some((s) => s.id === u.id)) return;
    if (xSel.length >= 20) { setMsg("You can send to up to 20 recipients at a time."); return; }
    setXSel([...xSel, { id: u.id, username: u.username, name: u.name, avatar: u.avatar, amount: "" }]);
    setXq("");
    setXRes([]);
    setXNote("");
  }

  async function prepare() {
    setMsg("");
    const out: { raw: string; amount: string }[] = [];
    const errs: string[] = [];
    text.split("\n").map((l) => l.trim()).filter(Boolean).forEach((l, i) => {
      const t = l.split(/[\s,;]+/).filter(Boolean);
      const amt = (t[1] || common).trim();
      if (!parseUnits6(amt)) errs.push(`Line ${i + 1}: add a valid amount for ${t[0]}`);
      else out.push({ raw: t[0], amount: amt });
    });
    const xs: { s: XSel; amount: string }[] = [];
    xSel.forEach((s) => {
      const amt = (s.amount || common).trim();
      if (!parseUnits6(amt)) errs.push(`Add a valid amount for @${s.username}`);
      else xs.push({ s, amount: amt });
    });
    if (errs.length) return setMsg(errs.slice(0, 3).join("\n"));
    const count = out.length + xs.length;
    if (count === 0) return setMsg("Add at least one recipient.");
    if (count > 20) return setMsg("You can send to up to 20 recipients at a time.");

    setStep("preparing");
    const rs: Row[] = [];
    const bad: string[] = [];
    let n = 0;

    // X accounts chosen from search: resolved by their permanent X id
    for (const { s, amount } of xs) {
      n++;
      setProgress(`Preparing ${n} of ${count}…`);
      const units = parseUnits6(amount) as bigint;
      try {
        const r = await api("/api/recipients/resolve-x", { method: "POST", body: JSON.stringify({ xId: s.id }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "couldn't prepare");
        const xu = d.x || {};
        if (d.kind === "user") rs.push({ label: `@${d.username}`, kind: "user", address: d.address, amount, units, avatar: xu.avatar || s.avatar, name: xu.name || s.name });
        else rs.push({ label: `@${d.handle}`, kind: "x", address: d.address, amount, units, x: d.handle, escrowId: d.escrowId, avatar: xu.avatar || s.avatar, name: xu.name || s.name });
      } catch (e: any) {
        bad.push(`@${s.username}: ${e?.message || "couldn't prepare"}`);
      }
    }

    // other recipients typed in the box
    for (const { raw, amount } of out) {
      n++;
      setProgress(`Preparing ${n} of ${count}…`);
      const units = parseUnits6(amount) as bigint;
      try {
        if (isAddress(raw)) {
          rs.push({ label: short(raw), kind: "wallet", address: raw, amount, units });
        } else if (EMAIL.test(raw)) {
          const r = await api("/api/recipients/resolve", { method: "POST", body: JSON.stringify({ email: raw }) });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "couldn't prepare");
          if (d.kind === "user") rs.push({ label: `@${d.username}`, kind: "user", address: d.address, amount, units });
          else rs.push({ label: raw.toLowerCase(), kind: "email", address: d.address, amount, units, email: raw.toLowerCase() });
        } else if (HANDLE.test(raw)) {
          const h = raw.replace(/^@/, "").toLowerCase();
          const s = await (await api(`/api/users/search?q=${encodeURIComponent(h)}`)).json();
          const p = (s.users || []).find((u: any) => u.username === h);
          if (p) {
            rs.push({ label: `@${p.username}`, kind: "user", address: p.wallet_address, amount, units });
          } else {
            const r = await api("/api/recipients/resolve-x", { method: "POST", body: JSON.stringify({ handle: h }) });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "couldn't prepare");
            const xu = d.x || {};
            if (d.kind === "user") rs.push({ label: `@${d.username}`, kind: "user", address: d.address, amount, units, avatar: xu.avatar, name: xu.name });
            else rs.push({ label: `@${d.handle}`, kind: "x", address: d.address, amount, units, x: d.handle, escrowId: d.escrowId, avatar: xu.avatar, name: xu.name });
          }
        } else {
          throw new Error("not recognised");
        }
      } catch (e: any) {
        bad.push(`${raw}: ${e?.message || "couldn't prepare"}`);
      }
    }

    if (bad.length) { setMsg("Fix these and try again:\n" + bad.slice(0, 4).join("\n")); setStep("form"); return; }
    const seen = new Set<string>();
    for (const r of rs) {
      const k = r.address.toLowerCase();
      if (seen.has(k)) { setMsg(`${r.label} is in the list more than once.`); setStep("form"); return; }
      seen.add(k);
    }
    if (me?.wallet_address && rs.some((r) => r.address.toLowerCase() === me.wallet_address!.toLowerCase())) {
      setMsg("You can't include yourself in the list."); setStep("form"); return;
    }
    const total = rs.reduce((a, r) => a + r.units, BigInt(0));
    const bal = bals[tok] ? parseUnits6(bals[tok]) : null;
    if (bal !== null && total > bal) { setMsg("You don't have enough balance to complete this payment."); setStep("form"); return; }
    setRows(rs);
    setStep("review");
  }

  async function confirm() {
    setStep("sending");
    setMsg("");
    let hash = "";
    try {
      const wallet: any = wallets.find((w: any) => w.walletClientType === "privy") ?? wallets[0];
      if (!wallet) throw new Error("Your wallet isn't ready yet");
      if (me?.wallet_address && wallet.address.toLowerCase() !== me.wallet_address.toLowerCase()) throw new Error("Wallet mismatch");
      const T = tokenBySymbol(tok)!;
      const calls = rows.map((r) => ({ to: T.address, data: encodeTransfer(r.address, r.units) }));
      const out: any = await sendTransaction({
        transaction: { type: 118, chainId: CHAIN_ID, feeToken: T.address, calls },
        wallet,
      } as any);
      if (!out?.hash) throw new Error("No transaction hash returned");
      hash = out.hash;
      setBatchHash(hash);
    } catch (e: any) {
      const detail = String(e?.shortMessage || e?.message || e).slice(0, 220);
      setMsg(`We couldn't complete this payment. Your funds were not charged. [${detail}]`);
      setStep("review");
      return;
    }
    try {
      const r = await api("/api/payments/batch", {
        method: "POST",
        body: JSON.stringify({
          txHash: hash,
          token: tokenBySymbol(tok)?.address,
          items: rows.map((x) => ({ to: x.address, amount: x.amount, memo: memo || undefined, recipientEmail: x.email, escrowId: x.escrowId })),
        }),
      });
      const d = await r.json();
      setResults(d.items || []);
      setExplorer(d.explorerUrl || "");
    } catch {}
    setStep("done");
  }

  function reset() { setText(""); setRows([]); setResults([]); setXSel([]); setMsg(""); setBatchHash(""); setStep("form"); }

  if (!ready || !authenticated || !me) return <Loader />;

  const total = rows.reduce((a, r) => a + r.units, BigInt(0));
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lineCount = text.split("\n").map((l) => l.trim()).filter(Boolean).length;
  const allOk = results.length === rows.length && rows.length > 0 && results.every((r) => r.status === "CONFIRMED");

  return (
    <main className="wrap center">
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>

      {step === "done" && (
        <>
          <div className="sentcard">
            <img src="/logo.svg" alt="" width={48} height={48} />
            <p className="sentlabel">{allOk ? "BATCH SENT ✓" : "BATCH SUBMITTED"}</p>
            <div className="sentamt">${money(total)}</div>
            <p className="sentto">to <b>{rows.length} recipients</b></p>
            <p className="sentfoot">{allOk ? "Confirmed on Tempo · one transaction · one network fee" : "Tempo is taking a moment to confirm. Check Activity shortly."}</p>
          </div>
          <div className="list">
            {rows.map((r, i) => {
              const res = results.find((x) => x.leg === i);
              const link = res && (r.kind === "email" || r.kind === "x") ? `${origin}/claim/${res.id}` : "";
              return (
                <div key={i} className="card" style={{ textAlign: "left" }}>
                  <div className="xconfirm">
                    {r.avatar && <XAvatar src={r.avatar} size={36} />}
                    <span><b>{r.label}</b> <span className="small">· ${r.amount} · {KIND[r.kind]}</span></span>
                  </div>
                  <div className="small">{res ? (res.status === "CONFIRMED" ? "✓ Confirmed on Tempo" : res.status === "FAILED" ? "Failed" : "Confirming…") : "Recording…"}</div>
                  {link && res?.status === "CONFIRMED" && (
                    <div className="cta" style={{ marginTop: 8 }}>
                      <button className="btn" onClick={() => { navigator.clipboard.writeText(link); setCopied(i); setTimeout(() => setCopied(-1), 1500); }}>{copied === i ? "Copied ✓" : "Copy claim link"}</button>
                      {r.kind === "x" && (
                        <a className="btn" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(`I just tipped @${r.x} $${r.amount} on CashPay 💸\n\nClaim it here:`)}&url=${encodeURIComponent(toSite(link))}`}>Share on X</a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="cta">
            {allOk && batchHash && rows.some((r) => r.x) && tweetChunks(rows.filter((r) => r.x).map((r) => r.x as string)).map((c, i, arr) => (
              <a key={i} className="btn primary" target="_blank" rel="noreferrer" href={tweetHref(c, toSite(`${origin}/batch/${batchHash}`))}>{arr.length > 1 ? `Share on X (${i + 1}/${arr.length})` : "Share all on X"}</a>
            ))}
            {batchHash && <button className="btn" onClick={() => { navigator.clipboard.writeText(`${origin}/batch/${batchHash}`); }}>Copy batch link</button>}
            {explorer && <a className="btn" href={explorer} target="_blank" rel="noreferrer">View transaction</a>}
            <button className="btn" onClick={reset}>New batch</button>
            <a className="btn primary" href="/activity">Activity</a>
          </div>
        </>
      )}

      {step === "sending" && (
        <>
          <h1 className="h-sm">Sending…</h1>
          <p className="lead">If a wallet window appears, review it and confirm once for all recipients.</p>
        </>
      )}

      {step === "preparing" && (
        <>
          <h1 className="h-sm">Preparing…</h1>
          <p className="lead">{progress}</p>
        </>
      )}

      {step === "review" && (
        <>
          <h1 className="h-sm">Review batch</h1>
          <p className="small">Check every recipient and amount. Nothing is sent until you confirm.</p>
          <div className="list">
            {rows.map((r, i) => (
              <div key={i} className="act" style={{ cursor: "default" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {r.avatar && <XAvatar src={r.avatar} size={36} />}
                  <span><b>{r.label}</b><span className="small" style={{ display: "block" }}>{r.name ? `${r.name} · ` : ""}{KIND[r.kind]}</span></span>
                </span>
                <b>${r.amount}</b>
              </div>
            ))}
          </div>
          <div className="card" style={{ width: "100%", textAlign: "left" }}>
            <div className="small">Total</div>
            <div className="amt">${money(total)}</div>
            <p className="small">{rows.length} recipients · Network: Tempo · Asset: {tok}</p>
            {memo && <p className="small">Message: “{memo}”</p>}
          </div>
          {msg && <p className="small">{msg}</p>}
          <div className="cta">
            <button className="btn primary" onClick={confirm}>Confirm & Send</button>
            <button className="btn" onClick={() => setStep("form")}>Back</button>
          </div>
        </>
      )}

      {step === "form" && (
        <>
          <h1 className="h-sm">Bulk send</h1>
          <div className="form">
            <TokenPicker value={tok} onChange={setTok} balances={bals} />

            <div className="card" style={{ textAlign: "left" }}>
              <b>Add X accounts</b>
              <input value={xq} onChange={(e) => setXq(e.target.value)} placeholder="Search X name or @username" autoCapitalize="none" style={{ marginTop: 8, width: "100%" }} />
              {xBusy && <p className="small">Searching…</p>}
              {xNote && <p className="small">{xNote}</p>}
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {xRes.map((u) => {
                  const added = xSel.some((s) => s.id === u.id);
                  return (
                    <button type="button" key={u.id} className="xr" disabled={added} onClick={() => addX(u)}>
                      <XAvatar src={u.avatar} size={44} />
                      <span><b>{u.name}</b><small>@{u.username}</small></span>
                      <span className="tag">{added ? "Added ✓" : u.cashpay ? "On CashPay · Add" : "+ Add"}</span>
                    </button>
                  );
                })}
              </div>
              {xSel.length > 0 && (
                <>
                  <div className="small" style={{ marginTop: 14, fontWeight: 700 }}>Selected ({xSel.length})</div>
                  <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    {xSel.map((s) => (
                      <div key={s.id} className="xsel">
                        <XAvatar src={s.avatar} size={40} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <b>{s.name}</b>
                          <small style={{ display: "block", color: "var(--muted)" }}>@{s.username}</small>
                        </span>
                        <input inputMode="decimal" placeholder={common || "Amount"} value={s.amount} onChange={(e) => setXSel(xSel.map((z) => (z.id === s.id ? { ...z, amount: e.target.value } : z)))} />
                        <button type="button" className="xdel" aria-label="Remove" onClick={() => setXSel(xSel.filter((z) => z.id !== s.id))}>×</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <label>
              Other recipients (one per line: recipient amount)
              <textarea className="bulk" value={text} onChange={(e) => setText(e.target.value)} rows={5} autoCapitalize="none"
                placeholder={"@john 5\nsarah@gmail.com 10\n0x1234…abcd 20"} />
            </label>
            <label>Same amount for everyone (optional)
              <div className="amtrow">
                <input inputMode="decimal" value={common} onChange={(e) => setCommon(e.target.value)} placeholder="5.00" />
                <button type="button" className="maxbtn" onClick={() => setCommon(maxSendable(bals[tok] || "0", lineCount + xSel.length))}>Max</button>
              </div>
            </label>
            <label>Message (optional)<input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={140} placeholder="Thanks, team!" /></label>
            {msg && <p className="small" style={{ whiteSpace: "pre-line" }}>{msg}</p>}
            <button className="btn primary" onClick={prepare}>Review</button>
          </div>
        </>
      )}
    </main>
  );
}
