"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { defineChain } from "viem";
import * as viemChains from "viem/chains";

const tempoChain: any =
  (viemChains as any).tempo ??
  defineChain({
    id: 4217,
    name: "Tempo",
    nativeCurrency: { name: "USD", symbol: "USD", decimals: 18 },
    rpcUrls: { default: { http: ["https://rpc.tempo.xyz"] } },
    blockExplorers: { default: { name: "Tempo Explorer", url: "https://explore.tempo.xyz" } },
  });

const config: any = {
  loginMethods: ["google", "email", "wallet"],
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
    ethereum: { createOnLogin: "users-without-wallets" },
  },
  appearance: { theme: "light", accentColor: "#0E7C66" },
  defaultChain: tempoChain,
  supportedChains: [tempoChain],
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!} config={config}>
      {children}
    </PrivyProvider>
  );
}
