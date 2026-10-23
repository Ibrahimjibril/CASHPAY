"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSendTransaction } from "@privy-io/react-auth/tempo";
import Loader from "@/app/components/Loader";
import BackButton from "@/app/components/BackButton";
import TokenPicker from "@/app/components/TokenPicker";
import { usePasskey } from "@/app/components/PasskeyProvider";
import { CHAIN_ID, parseUnits6, encodeTransfer, isAddress, maxSendable } from "@/lib/money";
import { tokenBySymbol } from "@/lib/tokens";
import { toSite } from "@/lib/site";
import { tweetChunks, tweetHref } from "@/lib/share";

type Kind = "user" | "email" | "x" | "wallet";
type In = { id: number; to: string; amount: string; note: string };
type Row = { rid: number; label: string; kind: Kind; address: string; amount: string; units: bigint; note: string; email?: string; x?: string; escrowId?: string; name?: string };
type Result = { id: string; leg: number; status: string };
type Look = { cashpay: boolean; name?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE = /^@?[A-Za-z0-9_]{1,15}$/;
const KIND: Record<Kind, string> = { user: "CashPay", email: "Email · claim link", x: "X · claims with X", wallet: "Wallet" };
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const money = (u: bigint) => `${u / BigInt(1000000)}.${(u % BigInt(1000000)).toString().padStart(6, "0").slice(0, 2)}`;
const isFilled = (r: In) => r.to.trim() !== "" || r.amount.trim() !== "" || r.note.trim() !== "";

function classify(raw: string): { kind: "wallet" | "email" | "handle" | null; err: string; key: string } {
  const v = raw.trim();
  if (!v) return { kind: null, err: "", key: "" };
  if (/^0x/i.test(v)) {
    return isAddress(v) ? { kind: "wallet", err: "", key: v.toLowerCase() } : { kind: null, err: "A wallet address is 0x followed by 40 letters or numbers.", key: "" };
  }
  if (v.includes("@") && !v.startsWith("@")) {
    return EMAIL.test(v) ? { kind: "email", err: "", key: v.toLowerCase() } : { kind: null, err: "This email address doesn't look right.", key: "" };
  }
  if (HANDLE.test(v)) return { kind: "handle", err: "", key: v.replace(/^@/, "").toLowerCase() };
  return { kind: null, err: "Enter a wallet address, an email or an @username.", key: "" };
}

export default function BulkSend() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const passkey = usePasskey();
  const router = useRouter();

  const [me, setMe] = useState<{ wallet_address: string | null } | null>(null);
  const [bals, setBals] = useState<Record<string, string>>({});
  const [tok, setTok] = useState("OUSD");
  const nextId = useRef(3);
  const [rows, setRows] = useState<In[]>([{ id: 1, to: "", amount: "", note: "" }, { id: 2, to: "", amount: "", note: "" }]);
  const [look, setLook] = useState<Record<string, Look>>({});
  const [touched, setTouched] = useState<Record<number, boolean>>({});
  const [errs, setErrs] = useState<Record<number, string>>({});
  const [showAll, setShowAll] = useState(false);
  const [common, setCommon] = useState("");
  const [paste, setPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [step, setStep] = useState<"form" | "preparing" | "review" | "sending" | "done">("form");
  const [plan, setPlan] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [explorer, setExplorer] = useState("");
  const [copied, setCopied] = useState(-1);
  const [batchHash, setBatchHash] = useState("");

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

  // checks (cheaply) which @names are CashPay users, so the sender sees who they are paying
  useEffect(() => {
    const keys = Array.from(new Set(rows.map((r) => classify(r.to)).filter((c) => c.kind === "handle").map((c) => c.key)))
      .filter((k) => !(k in look))
      .slice(0, 20);
    if (!keys.length) return;
    const t = setTimeout(async () => {
      for (const k of keys) {
        try {
          const r = await api(`/api/users/search?q=${encodeURIComponent(k)}`);
          const d = await r.json();
          const p = (d.users || []).find((u: any) => u.username === k);
          setLook((m) => ({ ...m, [k]: p ? { cashpay: true, name: p.display_name } : { cashpay: false } }));
        } catch {}
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // ---- row helpers
  const update = (id: number, patch: Partial<In>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const touch = (id: number) => setTouched((t) => ({ ...t, [id]: true }));
  function add() {
    if (rows.length >= 20) return;
    setRows((rs) => [...rs, { id: nextId.current++, to: "", amount: "", note: "" }]);
  }
  function del(id: number) {
    setRows((rs) => (rs.length <= 1 ? [{ id: nextId.current++, to: "", amount: "", note: "" }] : rs.filter((r) => r.id !== id)));
    setErrs((e) => { const n = { ...e }; delete n[id]; return n; });
  }
  function applyAmount(a: string) {
    setRows((rs) => rs.map((r) => (r.to.trim() ? { ...r, amount: a } : r)));
  }
  function addPasted() {
    const parsed = pasteText.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const t = l.split(/[\s,;]+/).filter(Boolean);
      return { to: t[0] || "", amount: t[1] || common || "", note: "" };
    });
    if (!parsed.length) return;
    setRows((rs) => {
      const kept = rs.filter(isFilled);
      const merged = [...kept, ...parsed.map((p) => ({ id: nextId.current++, ...p }))].slice(0, 20);
      return merged.length ? merged : rs;
    });
    setPasteText("");
    setPaste(false);
  }

  // ---- validation (computed on every render)
  const cls = rows.map((r) => classify(r.to));
  const seen = new Map<string, number>();
  const view = rows.map((r, i) => {
    const c = cls[i];
    const units = parseUnits6(r.amount.trim());
    const filled = isFilled(r);
    let err = errs[r.id] || "";
    if (!err && filled) {
      if (!r.to.trim()) err = "Add a recipient (wallet, email or @username).";
      else if (c.err) err = c.err;
      else if (c.key) {
        const first = seen.get(c.key);
        if (first !== undefined) err = `Same as recipient ${first + 1}.`;
        else seen.set(c.key, i);
      }
      if (!err && c.kind === "wallet" && me?.wallet_address && c.key === me.wallet_address.toLowerCase()) err = "That's your own wallet.";
    }
    const amtErr = filled && !(units && units > BigInt(0)) ? "Enter an amount greater than 0." : "";
    const ok = filled && !err && !amtErr && !!c.kind;
    return { c, units, filled, err, amtErr, ok };
  });
  const filledCount = view.filter((v) => v.filled).length;
  const okCount = view.filter((v) => v.ok).length;
  const total = view.reduce((a, v) => (v.ok && v.units ? a + v.units : a), BigInt(0));

  async function prepare() {
    setShowAll(true);
    setMsg("");
    setErrs({});
    const items = rows.map((r, i) => ({ r, v: view[i] })).filter((x) => x.v.filled);
    if (items.length === 0) return setMsg("Add at least one recipient.");
    if (items.some((x) => !x.v.ok)) return setMsg("Fix the highlighted recipients first.");

    setStep("preparing");
    const list: Row[] = [];
    const bad: Record<number, string> = {};
    let n = 0;
    for (const { r, v } of items) {
      n++;
      setProgress(`Checking ${n} of ${items.length}…`);
      const amount = r.amount.trim();
      const units = v.units as bigint;
      const note = r.note.trim();
      const raw = r.to.trim();
      try {
        if (v.c.kind === "wallet") {
          list.push({ rid: r.id, label: short(raw), kind: "wallet", address: raw, amount, units, note });
        } else if (v.c.kind === "email") {
          const res = await api("/api/recipients/resolve", { method: "POST", body: JSON.stringify({ email: raw }) });
          const d = await res.json();
          if (!res.ok) throw new Error(d.error || "We couldn't prepare this recipient.");
          if (d.kind === "user") list.push({ rid: r.id, label: `@${d.username}`, kind: "user", address: d.address, amount, units, note, name: raw.toLowerCase() });
          else list.push({ rid: r.id, label: raw.toLowerCase(), kind: "email", address: d.address, amount, units, note, email: raw.toLowerCase(), escrowId: d.escrowId });
        } else {
          const h = v.c.key;
          const s = await (await api(`/api/users/search?q=${encodeURIComponent(h)}`)).json();
          const p = (s.users || []).find((u: any) => u.username === h);
          if (p) {
            list.push({ rid: r.id, label: `@${p.username}`, kind: "user", address: p.wallet_address, amount, units, note, name: p.display_name });
          } else {
            const res = await api("/api/recipients/resolve-x", { method: "POST", body: JSON.stringify({ handle: h }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || "We couldn't prepare this recipient.");
            if (d.kind === "user") list.push({ rid: r.id, label: `@${d.username}`, kind: "user", address: d.address, amount, units, note, name: `X @${d.handle}` });
            else list.push({ rid: r.id, label: `@${d.handle}`, kind: "x", address: d.address, amount, units, note, x: d.handle, escrowId: d.escrowId });
          }
        }
      } catch (e: any) {
        bad[r.id] = e?.message || "We couldn't prepare this recipient.";
      }
    }

    const byAddr = new Map<string, Row>();
    for (const x of list) {
      const k = x.address.toLowerCase();
      if (me?.wallet_address && k === me.wallet_address.toLowerCase()) bad[x.rid] = "You can't send money to yourself.";
      else if (byAddr.has(k)) bad[x.rid] = `Same person as ${byAddr.get(k)!.label}.`;
      else byAddr.set(k, x);
    }
    if (Object.keys(bad).length) {
      setErrs(bad);
      setMsg("Fix the highlighted recipients.");
      setStep("form");
      return;
    }
    const sum = list.reduce((a, r) => a + r.units, BigInt(0));
    const bal = bals[tok] ? parseUnits6(bals[tok]) : null;
    if (bal !== null && sum > bal) { setMsg(`You don't have enough ${tok} to complete this payment.`); setStep("form"); return; }
    setPlan(list);
    setStep("review");
  }

  async function confirm() {
    setMsg("");
    if (!(await passkey.confirmTx())) { setMsg("Fingerprint confirmation is needed to send money."); return; }
    setStep("sending");
    let hash = "";
    try {
      const wallet: any = wallets.find((w: any) => w.walletClientType === "privy") ?? wallets[0];
      if (!wallet) throw new Error("Your wallet isn't ready yet");
      if (me?.wallet_address && wallet.address.toLowerCase() !== me.wallet_address.toLowerCase()) throw new Error("Wallet mismatch");
      const T = tokenBySymbol(tok)!;
      const calls = plan.map((r) => ({ to: T.address, data: encodeTransfer(r.address, r.units) }));
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
          items: plan.map((x) => ({ to: x.address, amount: x.amount, memo: x.note || undefined, recipientEmail: x.email, escrowId: x.escrowId })),
        }),
      });
      const d = await r.json();
      setResults(d.items || []);
      setExplorer(d.explorerUrl || "");
    } catch {}
    setStep("done");
  }

  function reset() {
    setRows([{ id: nextId.current++, to: "", amount: "", note: "" }, { id: nextId.current++, to: "", amount: "", note: "" }]);
    setPlan([]); setResults([]); setErrs({}); setTouched({}); setShowAll(false); setMsg(""); setBatchHash(""); setStep("form");
  }

  if (!ready || !authenticated || !me) return <Loader />;

  const planTotal = plan.reduce((a, r) => a + r.units, BigInt(0));
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const allOk = results.length === plan.length && plan.length > 0 && results.every((r) => r.status === "CONFIRMED");

  return (
    <main className="wrap center">
      <BackButton />
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>

      {step === "done" && (
        <>
          <div className="sentcard">
            <img src="/logo.svg" alt="" width={48} height={48} />
            <p className="sentlabel">{allOk ? "BATCH SENT ✓" : "BATCH SUBMITTED"}</p>
            <div className="sentamt">${money(planTotal)}</div>
            <p className="sentto">to <b>{plan.length} recipients</b></p>
            <p className="sentfoot">{allOk ? "Confirmed on Tempo · one transaction · one network fee" : "Tempo is taking a moment to confirm. Check Activity shortly."}</p>
          </div>
          <div className="list">
            {plan.map((r, i) => {
              const res = results.find((x) => x.leg === i);
              const link = res && (r.kind === "email" || r.kind === "x") ? `${origin}/claim/${res.id}` : "";
              return (
                <div key={i} className="card" style={{ textAlign: "left" }}>
                  <b>{r.label}</b> <span className="small">· ${r.amount} · {KIND[r.kind]}</span>
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
            {allOk && batchHash && plan.some((r) => r.x) && tweetChunks(plan.filter((r) => r.x).map((r) => r.x as string)).map((c, i, arr) => (
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
          <h1 className="h-sm">Checking recipients…</h1>
          <p className="lead">{progress}</p>
        </>
      )}

      {step === "review" && (
        <>
          <h1 className="h-sm">Review batch</h1>
          <p className="small">Check every recipient and amount. Nothing is sent until you confirm with your fingerprint.</p>
          <div className="list">
            {plan.map((r, i) => (
              <div key={i} className="act" style={{ cursor: "default" }}>
                <span>
                  <b>{r.label}</b>
                  <span className="small" style={{ display: "block" }}>{r.name ? `${r.name} · ` : ""}{KIND[r.kind]}{r.note ? ` · “${r.note}”` : ""}</span>
                </span>
                <b>${r.amount}</b>
              </div>
            ))}
          </div>
          <div className="card" style={{ width: "100%", textAlign: "left" }}>
            <div className="small">Total</div>
            <div className="amt">${money(planTotal)}</div>
            <p className="small">{plan.length} recipients · Network: Tempo · Asset: {tok}</p>
            {plan.some((r) => r.escrowId) && <p className="small">Email and X recipients who don't claim within 30 days are refunded to you.</p>}
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

            <div className="bk-sum">
              <span className="l">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                {filledCount} {filledCount === 1 ? "recipient" : "recipients"}
              </span>
              <b className="t">${money(total)} {tok}</b>
            </div>

            <div className="bk-tools">
              <input inputMode="decimal" placeholder="Same amount for all" value={common} onChange={(e) => setCommon(e.target.value)} />
              <button type="button" className="btn" onClick={() => applyAmount(common.trim())} disabled={!parseUnits6(common.trim())}>Apply</button>
              <button type="button" className="maxbtn" onClick={() => { const a = maxSendable(bals[tok] || "0", Math.max(1, rows.filter((r) => r.to.trim()).length)); setCommon(a); applyAmount(a); }}>Split</button>
              <button type="button" className="btn" onClick={() => setPaste(!paste)}>{paste ? "Close" : "Paste list"}</button>
            </div>
            {paste && (
              <div style={{ display: "grid", gap: 8 }}>
                <textarea className="bulk" rows={5} value={pasteText} onChange={(e) => setPasteText(e.target.value)} autoCapitalize="none"
                  placeholder={"One per line: recipient amount\n@john 5\nsarah@gmail.com 10\n0x1234…abcd 20"} />
                <button type="button" className="btn primary" onClick={addPasted}>Add to list</button>
              </div>
            )}

            {rows.map((r, i) => {
              const v = view[i];
              const vis = showAll || touched[r.id];
              const c = v.c;
              const lk = c.kind === "handle" ? look[c.key] : undefined;
              return (
                <div key={r.id} className={`bk-card${vis && (v.err || v.amtErr) ? " bad" : ""}`}>
                  <div className="bk-head">
                    <span>Recipient {i + 1}</span>
                    <button type="button" className="bk-del" aria-label={`Remove recipient ${i + 1}`} onClick={() => del(r.id)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                    </button>
                  </div>
                  <input
                    className="bk-in"
                    value={r.to}
                    placeholder="Wallet, email or @username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => { update(r.id, { to: e.target.value }); setErrs((x) => { if (!x[r.id]) return x; const n = { ...x }; delete n[r.id]; return n; }); }}
                    onBlur={() => touch(r.id)}
                  />
                  {c.kind === "wallet" && <span className="bk-chip info">Wallet · {short(r.to.trim())}</span>}
                  {c.kind === "email" && <span className="bk-chip info">Email · they'll get a claim link</span>}
                  {c.kind === "handle" && lk?.cashpay && <span className="bk-chip ok">On CashPay ✓ {lk.name || ""}</span>}
                  {c.kind === "handle" && lk && !lk.cashpay && <span className="bk-chip info">X account · claims by signing in with X</span>}
                  {c.kind === "handle" && !lk && <span className="bk-chip mute">Checking…</span>}
                  {vis && v.err && <span className="bk-err">{v.err}</span>}
                  <div className="bk-two">
                    <div className="bk-amt">
                      <span>$</span>
                      <input inputMode="decimal" placeholder="0.00" value={r.amount} onChange={(e) => update(r.id, { amount: e.target.value })} onBlur={() => touch(r.id)} />
                    </div>
                    <input placeholder="Note (optional)" maxLength={140} value={r.note} onChange={(e) => update(r.id, { note: e.target.value })} />
                  </div>
                  {vis && v.amtErr && <span className="bk-err">{v.amtErr}</span>}
                </div>
              );
            })}

            <button type="button" className="bk-add" onClick={add} disabled={rows.length >= 20}>+ Add Recipient ({rows.length}/20)</button>

            {msg && <p className="small" style={{ whiteSpace: "pre-line", color: "#ef4444" }}>{msg}</p>}
            <div className="bk-bar">
              <button className="btn primary" style={{ width: "100%" }} disabled={filledCount === 0} onClick={prepare}>
                Send to {okCount} {okCount === 1 ? "recipient" : "recipients"} — ${money(total)} {tok}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
