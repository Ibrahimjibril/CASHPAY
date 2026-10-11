import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

const SITE = "https://www.cashpayt.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "CashPay — Money for the social internet",
  description: "Send stablecoin payments to anyone using their email, username, X handle or wallet — powered by Tempo.",
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "CashPay — Send money. Just like sending a message.",
    description: "Send stablecoin payments to anyone using their email, username, X handle or wallet — powered by Tempo.",
    url: SITE,
    siteName: "CashPay",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@CashPay_",
    title: "CashPay — Money for the social internet",
    description: "Send money. Just like sending a message. Built on Tempo.",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
