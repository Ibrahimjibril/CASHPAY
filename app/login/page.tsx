"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function Login() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) router.replace("/dashboard");
  }, [ready, authenticated, router]);

  return (
    <main className="wrap center">
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <h1 className="h-sm">Welcome to CashPay</h1>
      <p className="lead">Sign in with Google, email or your wallet. A secure wallet is created for you automatically.</p>
      <button className="btn primary" disabled={!ready} onClick={login}>Continue</button>
    </main>
  );
}
