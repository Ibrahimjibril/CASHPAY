"use client";
import { useEffect, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export default function BatchClaim({ hash }: { hash: string }) {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [received, setReceived] = useState("");
  const [msg, setMsg] = useState("");
  const ran = useRef(false);
  const hasWallet = wallets.some((w: any) => w.walletClientType === "privy");

  async function run(attempt: number): Promise<void> {
    setState("claiming");
    setMsg("");
    try {
      const token = await getAccessToken();
      const r = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ batch: hash }),
      });
      const d = await r.json();
      if (((r.status === 409 && d.retry) || r.status === 202) && attempt < 6) {
        await new Promise((res) => setTimeout(res, 2500));
        return run(attempt + 1);
      }
      if (!r.ok && r.status !== 202) { setState("error"); setMsg(d.error || "Something went wrong."); ran.current = false; return; }
      if (d.status !== "CLAIMED") { setState("error"); setMsg("Your claim is still processing. Tap the button to check again."); ran.current = false; return; }
      setReceived(d.received);
      setState("done");
    } catch {
      setState("error");
      setMsg("Something went wrong. Please try again.");
      ran.current = false;
    }
  }

  useEffect(() => {
    if (!started || !ready || !authenticated || !hasWallet || ran.current) return;
    ran.current = true;
    run(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, ready, authenticated, hasWallet]);

  async function start() {
    ran.current = false;
    setStarted(true);
    if (authenticated) await logout();
    login({ loginMethods: ["twitter"] } as any);
  }

  if (state === "done") {
    return (
      <>
        <h1 className="h-sm">YOU CLAIMED ${received} 🎉</h1>
        <p className="small">A small network fee was deducted. The money is now in your CashPay wallet.</p>
        <a className="btn primary" href="/dashboard">Open my wallet</a>
      </>
    );
  }
  return (
    <>
      <button className="btn primary" disabled={!ready || state === "claiming"} onClick={start}>
        {state === "claiming" ? "Claiming…" : "Connect X to claim your tip"}
      </button>
      <p className="small">Sign in with the X account that was tagged. A wallet is created for you automatically.</p>
      {msg && <p className="small">{msg}</p>}
    </>
  );
}
