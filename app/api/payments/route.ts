import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TEMPO, getReceipt, matchesTransfer, sleep } from "@/lib/tempo";
import { OUSD_ADDRESS, parseUnits6 } from "@/lib/money";

const Body = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amount: z.string().max(30),
  memo: z.string().trim().max(140).optional(),
});

async function verify(hash: string, from: string, to: string, units: bigint) {
  for (let i = 0; i < 5; i++) {
    const r = await getReceipt(hash).catch(() => null);
    if (r) {
      if (r.status !== "0x1") return "FAILED";
      return matchesTransfer(r, OUSD_ADDRESS, from, to, units) ? "CONFIRMED" : "MISMATCH";
    }
    await sleep(1200);
  }
  return "SUBMITTED";
}

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the payment details." }, { status: 400 });

  const hash = parsed.data.txHash.toLowerCase();
  const to = parsed.data.to.toLowerCase();
  const amount = parsed.data.amount.trim();
  const units = parseUnits6(amount);
  if (!units || units <= BigInt(0)) return NextResponse.json({ error: "Invalid amount." }, { status: 400 });

  const me = await sql`select wallet_address from users where id = ${userId}`;
  const from = me[0]?.wallet_address as string | undefined;
  if (!from) return NextResponse.json({ error: "Your wallet isn't ready yet." }, { status: 400 });

  const explorerUrl = `${TEMPO.explorer}/tx/${hash}`;
  const existing = await sql`select sender_id, status from payments where tx_hash = ${hash}`;
  if (existing[0]) {
    if (existing[0].sender_id !== userId) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    if (existing[0].status !== "SUBMITTED") return NextResponse.json({ status: existing[0].status, explorerUrl });
  } else {
    const rec = await sql`select id from users where lower(wallet_address) = ${to}`;
    const recipientId = rec[0]?.id ?? null;
    await sql`
      insert into payments (sender_id, recipient_user_id, recipient_address, token, amount, memo, status, tx_hash)
      values (${userId}, ${recipientId}, ${to}, ${OUSD_ADDRESS.toLowerCase()}, ${amount}, ${parsed.data.memo || null}, 'SUBMITTED', ${hash})
      on conflict (tx_hash) do nothing`;
  }

  const status = await verify(hash, from, to, units);
  if (status !== "SUBMITTED") {
    await sql`update payments set status = ${status}, confirmed_at = case when ${status} = 'CONFIRMED' then now() else null end where tx_hash = ${hash}`;
  }
  return NextResponse.json({ status, explorerUrl });
}
