import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { refundPayment } from "@/lib/refund";

export const maxDuration = 60;

// Called once a day by Vercel Cron (it sends: Authorization: Bearer $CRON_SECRET)
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await sql`
    select id from payments
    where escrow_id is not null and status = 'CONFIRMED'
      and (claim_status is null or claim_status = 'REFUNDING')
      and coalesce(expires_at, created_at + interval '30 days') < now()
    order by created_at
    limit 10`;
  let refunded = 0;
  let failed = 0;
  for (const r of rows as any[]) {
    const x = await refundPayment(r.id);
    if (x.ok) refunded++; else failed++;
  }
  return NextResponse.json({ checked: rows.length, refunded, failed });
}
