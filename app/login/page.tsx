"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useLoginWithPasskey } from "@privy-io/react-auth";

export default function Login() {
  const { ready, authenticated, login } = usePrivy();
  const pk: any = useLoginWithPasskey();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && authenticated) router.replace("/dashboard");
  }, [ready, authenticated, router]);

  async function withPasskey() {
    setMsg("");
    setBusy(true);
    try {
      if (pk.loginWithPasskey) await pk.loginWithPasskey();
      else await pk.initPasskey();
    } catch {
      setMsg("We couldn't sign you in with a passkey. Use another method, then add a passkey in Profile → Security.");
    }
    setBusy(false);
  }

  return (
    <main className="wrap center">
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <h1 className="h-sm">Welcome to CashPay</h1>
      <p className="lead">Sign in with Google, email, X or your wallet. A secure wallet is created for you automatically.</p>
      <button className="btn primary" disabled={!ready} onClick={() => login()}>Continue</button>
      <button className="btn" disabled={!ready || busy} onClick={withPasskey}>
        {busy ? "Waiting for your fingerprint…" : "Sign in with fingerprint (passkey)"}
      </button>
      {msg && <p className="small">{msg}</p>}
    </main>
  );
}
