"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function PayButton({ url, amount }: { url: string; amount: string }) {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (go && ready && authenticated) router.push(url);
  }, [go, ready, authenticated, router, url]);

  return (
    <button className="btn primary" disabled={!ready} onClick={() => { if (authenticated) router.push(url); else { setGo(true); login(); } }}>
      Pay ${amount}
    </button>
  );
}
