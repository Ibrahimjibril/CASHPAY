"use client";
import { PrivyProvider } from "@privy-io/react-auth";

const config: any = {
  loginMethods: ["google", "email", "wallet"],
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
    ethereum: { createOnLogin: "users-without-wallets" },
  },
  appearance: { theme: "light", accentColor: "#0E7C66" },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!} config={config}>
      {children}
    </PrivyProvider>
  );
}
