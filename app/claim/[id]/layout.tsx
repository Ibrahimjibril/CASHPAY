import type { Metadata } from "next";
import { sql } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const base = new URL(process.env.NEXT_PUBLIC_APP_URL || "https://cashpay-tau.vercel.app");
  const { id } = await params;
  let title = "You received money on CashPay";
  let description = "Claim it in seconds. Money for the social internet.";
  if (/^[0-9a-fA-F-]{36}$/.test(id)) {
    const rows = await sql`select p.amount, p.recipient_x, u.username from payments p join users u on u.id = p.sender_id where p.id = ${id}`;
    const p = rows[0];
    if (p) {
      const amount = Number(p.amount).toFixed(2);
      title = p.recipient_x ? `$${amount} tip for @${p.recipient_x} on CashPay` : `You received $${amount} on CashPay`;
      description = `@${p.username} sent money through CashPay. Claim it in seconds.`;
    }
  }
  return {
    metadataBase: base,
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
