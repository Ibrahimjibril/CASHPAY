import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "CashPay — Money for the social internet",
  description: "Send stablecoin payments to anyone using their email, username, or wallet — powered by Tempo.",
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "CashPay — Send money. Just like sending a message.",
    description: "Send stablecoin payments to anyone using their email, username, or wallet — powered by Tempo.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "CashPay", description: "Money for the social internet." },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
