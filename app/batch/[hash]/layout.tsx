import type { Metadata } from "next";
import { sql } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }): Promise<Metadata> {
  const base = new URL(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.cashpayt.xyz");
  const { hash } = await params;
  let title = "Tips on CashPay";
  let description = "Claim your tip in seconds. Money for the social internet.";
  if (/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    const rows = await sql`
      select p.amount, u.username from payments p join users u on u.id = p.sender_id
      where p.tx_hash = ${hash.toLowerCase()}`;
    if (rows.length) {
      const total = rows.reduce((a: number, r: any) => a + Number(r.amount), 0).toFixed(2);
      title = `$${total} in tips from @${rows[0].username} on CashPay`;
      description = `${rows.length} people were tipped. Connect X to claim yours.`;
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

export default function BatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
