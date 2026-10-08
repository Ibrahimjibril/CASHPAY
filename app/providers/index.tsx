"use client";
import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["google", "email", "wallet"],
        embeddedWallets: { createOnLogin: "users-without-wallets" },
        appearance: { theme: "light", accentColor: "#0E7C66" },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
