"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function ClaimButton({ amount }: { amount: string }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const router = useRouter();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started && ready && authenticated) router.replace("/dashboard");
  }, [started, ready, authenticated, router]);

  async function start() {
    setStarted(true);
    if (authenticated) await logout();
    login({ loginMethods: ["email"] } as any);
  }

  return (
    <>
      <button className="btn primary" disabled={!ready} onClick={start}>Claim ${amount}</button>
      <p className="small">Sign in with the email address this money was sent to. We'll send you a one-time code.</p>
    </>
  );
}
