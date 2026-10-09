import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TEMPO, getReceipt, matchesTransfer, sleep } from "@/lib/tempo";
import { parseUnits6 } from "@/lib/money";
import { DEFAULT_TOKEN, tokenByAddress, tokenBySymbol } from "@/lib/tokens";
import { notifyRecipient } from "@/lib/notify";

export const maxDuration = 30;

const UUID = /^[0-9a-fA-F-]{36}$/;
const Item = z.object({
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amount: z.string().max(30),
  memo: z.string().trim().max(140).optional(),
  recipientEmail: z.string().trim().toLowerCase().email().max(120).optional(),
  escrowId: z.string().regex(UUID).optional(),
});
const Body = z.object({
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  token: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  items: z.array(Item).min(1).max(20),
});

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the payment details." }, { status: 400 });

  const hash = parsed.data.txHash.toLowerCase();
  if (parsed.data.token && !tokenByAddress(parsed.data.token)) return NextResponse.json({ error: "Unsupported asset." }, { status: 400 });
  const token = (tokenByAddress(parsed.data.token) ?? tokenBySymbol(DEFAULT_TOKEN)!).address.toLowerCase();
  const me = await sql`select wallet_address from users where id = ${userId}`;
  const from = me[0]?.wallet_address as string | undefined;
  if (!from) return NextResponse.json({ error: "Your wallet isn't ready yet." }, { status: 400 });
  const explorerUrl = `${TEMPO.explorer}/tx/${hash}`;

  const existing = await sql`select sender_id from payments where tx_hash = ${hash} limit 1`;
  if (existing[0]) {
    if (existing[0].sender_id !== userId) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  } else {
    const prepared: any[] = [];
    for (let i = 0; i < parsed.data.items.length; i++) {
      const it = parsed.data.items[i];
      const to = it.to.toLowerCase();
      const amount = it.amount.trim();
      const units = parseUnits6(amount);
      if (!units || units <= BigInt(0)) return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      let escrowId: string | null = null;
      let recipientX: string | null = null;
      if (it.escrowId) {
        const e = await sql`select created_by, handle, address from escrows where id = ${it.escrowId}`;
        if (!e[0] || e[0].created_by !== userId || e[0].address !== to) {
          return NextResponse.json({ error: "Invalid recipient." }, { status: 400 });
        }
        escrowId = it.escrowId;
        recipientX = e[0].handle;
      }
      prepared.push({ i, to, amount, memo: it.memo || null, email: it.recipientEmail ?? null, escrowId, recipientX });
    }
    for (const p of prepared) {
      const rec = await sql`select id from users where lower(wallet_address) = ${p.to}`;
      await sql`
        insert into payments (sender_id, recipient_user_id, recipient_address, recipient_email, recipient_x, escrow_id, token, amount, memo, status, tx_hash, leg)
        values (${userId}, ${rec[0]?.id ?? null}, ${p.to}, ${p.email}, ${p.recipientX}, ${p.escrowId}, ${token}, ${p.amount}, ${p.memo}, 'SUBMITTED', ${hash}, ${p.i})
        on conflict do nothing`;
    }
  }

  const loadLegs = () =>
    sql`select id, leg, recipient_address, amount, escrow_id, status from payments where tx_hash = ${hash} order by leg`;
  let legs: any[] = await loadLegs();

  if (legs.some((l) => l.status === "SUBMITTED")) {
    let receipt: any = null;
    for (let i = 0; i < 5; i++) {
      receipt = await getReceipt(hash).catch(() => null);
      if (receipt) break;
      await sleep(1200);
    }
    if (receipt) {
      for (const l of legs) {
        const st =
          receipt.status !== "0x1"
            ? "FAILED"
            : matchesTransfer(receipt, token, from, l.recipient_address, parseUnits6(String(l.amount)) ?? BigInt(0))
            ? "CONFIRMED"
            : "MISMATCH";
        await sql`update payments set status = ${st}, confirmed_at = case when ${st} = 'CONFIRMED' then now() else null end where id = ${l.id}`;
      }
      legs = await loadLegs();
      const origin = new URL(req.url).origin;
      for (const l of legs) {
        if (l.status === "CONFIRMED" && !l.escrow_id) await notifyRecipient(origin, l.id).catch(() => {});
      }
    }
  }

  const all = legs.every((l) => l.status === "CONFIRMED");
  return NextResponse.json({
    status: all ? "CONFIRMED" : legs.some((l) => l.status === "FAILED") ? "FAILED" : "SUBMITTED",
    explorerUrl,
    items: legs.map((l) => ({ id: l.id, leg: l.leg, status: l.status })),
  });
}
