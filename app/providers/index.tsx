"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PrivyProvider } from "@privy-io/react-auth";
import { defineChain } from "viem";
import * as viemChains from "viem/chains";
import { I18nProvider } from "@/lib/i18n";

const tempoChain: any =
  (viemChains as any).tempo ??
  defineChain({
    id: 4217,
    name: "Tempo",
    nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.tempo.xyz"] } },
    blockExplorers: { default: { name: "Tempo Explorer", url: "https://explore.mainnet.tempo.xyz" } },
  });

const config: any = {
  loginMethods: ["google", "email", "twitter", "wallet"],
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
    ethereum: { createOnLogin: "users-without-wallets" },
  },
  appearance: { theme: "light", accentColor: "#0E7C66" },
  defaultChain: tempoChain,
  supportedChains: [tempoChain],
};

// Turns normal <a href="/..."> clicks into instant client-side navigation (no full page reload).
function FastLinks() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//") || a.target === "_blank" || a.hasAttribute("download")) return;
      e.preventDefault();
      router.push(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!} config={config}>
      <I18nProvider>
        <FastLinks />
        {children}
      </I18nProvider>
    </PrivyProvider>
  );
}
