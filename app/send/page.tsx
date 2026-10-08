"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSendTransaction } from "@privy-io/react-auth/tempo";
import { CHAIN_ID, OUSD_ADDRESS, parseUnits6, encodeTransfer, isAddress } from "@/lib/money";

type Person = { username: string; display_name: string; wallet_address: string };
type Recipient = { label: string; sub?: string; address: string; email?: string };
type Done = { hash: string; id?: string; status: string; explorerUrl: string; emailed: boolean };

const QUICK = ["5", "10", "20", "50", "100"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function Send() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const router = useRouter();

  const [me, setMe] = useState<{ wallet_address: string | null } | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [to, setTo] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [step, setStep] = useState<"form" | "review" | "sending" | "done">("form");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

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

  useEffect(() => {
    if (!ready || !authenticated || !me || prefilled) return;
    setPrefilled(true);
    const sp = new URLSearchParams(window.location.search);
    const u = (sp.get("u") || "").replace(/^@/, "").toLowerCase();
    if (sp.get("amount")) setAmount(sp.get("amount") as string);
    if (sp.get("memo")) setMemo(sp.get("memo") as string);
    if (sp.get("request")) setRequestId(sp.get("request"));
    if (u) {
      api("/api/users/search?q=" + encodeURIComponent(u))
        .then((r) => r.json())
        .then((d) => {
          const p = (d.users || []).find((x: Person) => x.username === u);
          if (p) setTo({ label: "@" + p.username, sub: p.display_name, address: p.wallet_address });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, me]);

  const q = query.trim();
  const isEmail = EMAIL.test(q) && !q.startsWith("@");

  useEffect(() => {
    const s = q.replace(/^@/, "");
    if (s.length < 2 || isAddress(s) || s.includes(".")) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await api(`/api/users/search?q=${encodeURIComponent(s)}`);
      const d = await r.json();
      setResults(d.users || []);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function useEmail() {
    setBusy(true);
    setMsg("");
    try {
      const r = await api("/api/recipients/resolve", { method: "POST", body: JSON.stringify({ email: q }) });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || "We couldn't prepare this payment."); }
      else if (d.kind === "user") setTo({ label: `@${d.username}`, sub: q, address: d.address });
      else setTo({ label: q.toLowerCase(), sub: "New to CashPay. They'll get a claim link.", address: d.address, email: q.toLowerCase() });
    } catch { setMsg("We couldn't prepare this payment. Please try again."); }
    setBusy(false);
  }

  function review() {
    setMsg("");
    const units = parseUnits6(amount);
    if (!to) return setMsg("Choose who you want to pay.");
    if (!units || units <= BigInt(0)) return setMsg("Enter a valid amount.");
    const bal = balance ? parseUnits6(balance) : null;
    if (bal !== null && units > bal) return setMsg("You don't have enough balance to complete this payment.");
    if (me?.wallet_address && to.address.toLowerCase() === me.wallet_address.toLowerCase()) return setMsg("You can't send money to yourself.");
    setStep("review");
  }

  async function confirm() {
    const units = parseUnits6(amount);
    if (!to || !units) return;
    setStep("sending");
    setMsg("");
    let hash = "";
    try {
      const wallet: any = wallets.find((w: any) => w.walletClientType === "privy") ?? wallets[0];
      if (!wallet) throw new Error("Your wallet isn't ready yet");
      if (me?.wallet_address && wallet.address.toLowerCase() !== me.wallet_address.toLowerCase()) throw new Error("Wallet mismatch");
      const out: any = await sendTransaction({
        transaction: {
          type: 118,
          chainId: CHAIN_ID,
          feeToken: OUSD_ADDRESS,
          calls: [{ to: OUSD_ADDRESS, data: encodeTransfer(to.address, units) }],
        },
        wallet,
      } as any);
      if (!out?.hash) throw new Error("No transaction hash returned");
      hash = out.hash;
    } catch (e: any) {
      const detail = String(e?.shortMessage || e?.message || e).slice(0, 220);
      setMsg(`We couldn't complete this payment. Your funds were not charged. [${detail}]`);
      setStep("form");
      return;
    }
    let d: any = {};
    try {
      const r = await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({ txHash: hash, to: to.address, amount, memo, recipientEmail: to.email, requestId: requestId || undefined }),
      });
      d = await r.json();
    } catch {}
    setDone({ hash, id: d.id, status: d.status || "SUBMITTED", explorerUrl: d.explorerUrl || "", emailed: !!d.emailed });
    setStep("done");
  }

  function reset() { setTo(null); setAmount(""); setMemo(""); setQuery(""); setDone(null); setMsg(""); setStep("form"); }

  if (!ready || !authenticated || !me) return <main className="wrap center"><p className="small">Loading…</p></main>;

  const statusText: Record<string, string> = {
    CONFIRMED: "✓ Confirmed on Tempo",
    SUBMITTED: "Sent. Tempo is taking a moment to confirm.",
    MISMATCH: "Sent. We're double-checking the details.",
    FAILED: "This payment did not go through.",
  };
  const claimLink = done?.id && to?.email && typeof window !== "undefined" ? `${window.location.origin}/claim/${done.id}` : "";

  return (
    <main className="wrap center">
      <a className="brand" href="/dashboard"><img src="/logo.svg" alt="" />CashPay</a>

      {step === "done" && done && (
        <>
          <h1 className="h-sm">{done.status === "CONFIRMED" ? "✓ Money sent" : "Payment submitted"}</h1>
          <div className="amt">${amount}</div>
          <p className="small">to {to?.label}</p>
          <p className="ok">{statusText[done.status] || statusText.SUBMITTED}</p>
          {claimLink && (
            <div className="card" style={{ width: "100%", textAlign: "left" }}>
              <b>{done.emailed ? "We emailed them a claim link." : "Share this claim link with them:"}</b>
              <p className="small" style={{ wordBreak: "break-all" }}>{claimLink}</p>
              <div className="cta">
                <button className="btn" onClick={() => { navigator.clipboard.writeText(claimLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied ✓" : "Copy link"}</button>
                <a className="btn" target="_blank" rel="noreferrer" href={`https://x.com/intent/post?text=${encodeURIComponent(`I just sent someone $${amount} on CashPay 💸\n\nClaim it here:`)}&url=${encodeURIComponent(claimLink)}`}>Share on X</a>
              </div>
            </div>
          )}
          <div className="cta">
            {done.explorerUrl && <a className="btn" href={done.explorerUrl} target="_blank" rel="noreferrer">View transaction</a>}
            {to?.label.startsWith("@") && <a className="btn" target="_blank" rel="noreferrer" href={"https://x.com/intent/post?text=" + encodeURIComponent("I just sent " + to.label + " $" + amount + " on CashPay 💸 " + window.location.origin)}>Share on X</a>}
            <button className="btn primary" onClick={reset}>Send again</button>
            <a className="btn" href="/dashboard">Done</a>
          </div>
        </>
      )}

      {step === "sending" && (
        <>
          <h1 className="h-sm">Sending…</h1>
          <p className="lead">If a wallet window appears, review it and confirm.</p>
        </>
      )}

      {step === "review" && to && (
        <>
          <h1 className="h-sm">Review payment</h1>
          <div className="card" style={{ width: "100%", textAlign: "left" }}>
            <div className="small">You are sending</div>
            <div className="amt">${amount}</div>
            <p>To: <b>{to.label}</b></p>
            <p className="small">Network: Tempo · Asset: OUSD</p>
            {memo && <p className="small">Message: “{memo}”</p>}
          </div>
          <div className="cta">
            <button className="btn primary" onClick={confirm}>Confirm & Send</button>
            <button className="btn" onClick={() => setStep("form")}>Back</button>
          </div>
        </>
      )}

      {step === "form" && (
        <>
          <h1 className="h-sm">Send money</h1>
          {balance !== null && <p className="small">Balance: ${balance}</p>}
          <div className="form">
            {to ? (
              <div className="card">
                <b>{to.label}</b> {to.sub && <span className="small">· {to.sub}</span>}
                <div><button className="btn" onClick={() => setTo(null)}>Change</button></div>
              </div>
            ) : (
              <>
                <label>To<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="@username, email or wallet address" autoCapitalize="none" /></label>
                {results.map((p) => (
                  <button key={p.username} className="btn" onClick={() => { setTo({ label: `@${p.username}`, sub: p.display_name, address: p.wallet_address }); setResults([]); setQuery(""); }}>
                    {p.display_name} · @{p.username}
                  </button>
                ))}
                {isAddress(q) && <button className="btn" onClick={() => setTo({ label: short(q), address: q })}>Use address {short(q)}</button>}
                {isEmail && <button className="btn" disabled={busy} onClick={useEmail}>{busy ? "Preparing…" : `Send to ${q}`}</button>}
              </>
            )}
            <label>Amount ($)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20.00" /></label>
            <div className="chips" style={{ marginTop: 0 }}>
              {QUICK.map((v) => <button key={v} className="chip" onClick={() => setAmount(v)}>${v}</button>)}
            </div>
            <label>Message (optional)<input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={140} placeholder="Thanks for helping me!" /></label>
            {msg && <p className="small">{msg}</p>}
            <button className="btn primary" onClick={review}>Continue</button>
          </div>
        </>
      )}
    </main>
  );
}
