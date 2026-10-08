"use client";
import Loader from "@/app/components/Loader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSendTransaction } from "@privy-io/react-auth/tempo";
import { CHAIN_ID, OUSD_ADDRESS, parseUnits6, encodeTransfer, isAddress } from "@/lib/money";

type Kind = "user" | "email" | "x" | "wallet";
type Row = { label: string; kind: Kind; address: string; amount: string; units: bigint; email?: string; x?: string; escrowId?: string };
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
  const [balance, setBalance] = useState<string | null>(null);
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
    api("/api/balance").then((r) => r.json()).then((d) => { if (d.total) setBalance(d.total); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

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
    if (errs.length) return setMsg(errs.slice(0, 3).join("\n"));
    if (out.length === 0) return setMsg("Add at least one recipient.");
    if (out.length > 20) return setMsg("You can send to up to 20 recipients at a time.");

    setStep("preparing");
    const rs: Row[] = [];
    const bad: string[] = [];
    for (let i = 0; i < out.length; i++) {
      setProgress(`Preparing ${i + 1} of ${out.length}…`);
      const { raw, amount } = out[i];
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
            rs.push({ label: `@${d.handle}`, kind: "x", address: d.address, amount, units, x: d.handle, escrowId: d.escrowId });
          }
        } else {
          throw new Error("not recognised");
        }
      } catch (e: any) {
        bad.push(`${raw}: ${e?.message || "couldn't prepare"}`);
      }
    }
    if (bad.length) { setMsg("Fix these and try again:\n" + bad.slice(0, 4).join("\n")); setStep("form"); return; }
    if (me?.wallet_address && rs.some((r) => r.address.toLowerCase() === me.wallet_address!.toLowerCase())) {
      setMsg("You can't include yourself in the list."); setStep("form"); return;
    }
    const total = rs.reduce((a, r) => a + r.units, BigInt(0));
    const bal = balance ? parseUnits6(balance) : null;
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
      const calls = rows.map((r) => ({ to: OUSD_ADDRESS, data: encodeTransfer(r.address, r.units) }));
      const out: any = await sendTransaction({
        transaction: { type: 118, chainId: CHAIN_ID, feeToken: OUSD_ADDRESS, calls },
        wallet,
      } as any);
      if (!out?.hash) throw new Error("No transaction hash returned");
      hash = out.hash;
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
          items: rows.map((x) => ({ to: x.address, amount: x.amount, memo: memo || undefined, recipientEmail: x.email, escrowId: x.escrowId })),
        }),
      });
      const d = await r.json();
      setResults(d.items || []);
      setExplorer(d.explorerUrl || "");
    } catch {}
    setStep("done");
  }

  function reset() { setText(""); setRows([]); setResults([]); setMsg(""); setStep("form"); }

  if (!ready || !authenticated || !me) return <Loader />;

  const total = rows.reduce((a, r) => a + r.units, BigInt(0));
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <main className="wrap center">
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>

      {step === "done" && (
        <>
          <div className="sentcard">
            <img src="/logo.svg" alt="" width={48} height={48} />
            <p className="sentlabel">BATCH SENT ✓</p>
            <div className="sentamt">${money(total)}</div>
            <p className="sentto">to <b>{rows.length} recipients</b></p>
            <p className="sentfoot">One transaction · one network fee</p>
          </div>
          <div className="list">
            {rows.map((r, i) => {
              const res = results.find((x) => x.leg === i);
              const link = res && (r.kind === "email" || r.kind === "x") ? `${origin}/claim/${res.id}` : "";
              return (
                <div key={i} className="card" style={{ textAlign: "left" }}>
                  <b>{r.label}</b> <span className="small">· ${r.amount} · {KIND[r.kind]}</span>
                  <div className="small">{res ? (res.status === "CONFIRMED" ? "✓ Confirmed" : res.status) : "Recording…"}</div>
                  {link && (
                    <div className="cta" style={{ marginTop: 8 }}>
                      <button className="btn" onClick={() => { navigator.clipboard.writeText(link); setCopied(i); setTimeout(() => setCopied(-1), 1500); }}>{copied === i ? "Copied ✓" : "Copy claim link"}</button>
                      {r.kind === "x" && (
                        <a className="btn" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(`I just tipped @${r.x} $${r.amount} on CashPay 💸\n\nClaim it here:`)}&url=${encodeURIComponent(link)}`}>Share on X</a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="cta">
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
          <div className="list">
            {rows.map((r, i) => (
              <div key={i} className="act" style={{ cursor: "default" }}>
                <span><b>{r.label}</b><span className="small" style={{ display: "block" }}>{KIND[r.kind]}</span></span>
                <b>${r.amount}</b>
              </div>
            ))}
          </div>
          <div className="card" style={{ width: "100%", textAlign: "left" }}>
            <div className="small">Total</div>
            <div className="amt">${money(total)}</div>
            <p className="small">{rows.length} recipients · Network: Tempo · Asset: OUSD</p>
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
          {balance !== null && <p className="small">Balance: ${balance}</p>}
          <div className="form">
            <label>
              Recipients (one per line: recipient amount)
              <textarea className="bulk" value={text} onChange={(e) => setText(e.target.value)} rows={7} autoCapitalize="none"
                placeholder={"@john 5\nsarah@gmail.com 10\n0x1234…abcd 20\n@eeeman33 2"} />
            </label>
            <label>Same amount for everyone (optional)<input inputMode="decimal" value={common} onChange={(e) => setCommon(e.target.value)} placeholder="5.00" /></label>
            <label>Message (optional)<input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={140} placeholder="Thanks, team!" /></label>
            {msg && <p className="small" style={{ whiteSpace: "pre-line" }}>{msg}</p>}
            <button className="btn primary" onClick={prepare}>Continue</button>
          </div>
        </>
      )}
    </main>
  );
}
