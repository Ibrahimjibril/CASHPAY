import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getNodePrivy } from "@/lib/escrow";

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(120) });

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email;

  // A registered CashPay user: the money goes straight to their wallet
  const rows = await sql`select username, wallet_address from users where lower(email) = ${email} and wallet_address is not null limit 1`;
  if (rows[0]) return NextResponse.json({ kind: "user", username: rows[0].username, address: rows[0].wallet_address });

  // Otherwise a one-time escrow wallet that only the owner of this email can claim (and that expires)
  const recent = await sql`select count(*)::int as n from escrows where created_by = ${userId} and created_at > now() - interval '1 day'`;
  if (recent[0].n >= 30) return NextResponse.json({ error: "You've reached today's limit for new recipients." }, { status: 429 });

  try {
    const w = await getNodePrivy().wallets().create({ chain_type: "ethereum" });
    const address = String(w.address).toLowerCase();
    const ins = await sql`
      insert into escrows (created_by, handle, wallet_id, address, email)
      values (${userId}, 'email', ${w.id}, ${address}, ${email})
      returning id`;
    return NextResponse.json({ kind: "new", address, escrowId: ins[0].id });
  } catch (e) {
    console.error("email escrow failed", e);
    return NextResponse.json({ error: "We couldn't prepare this payment. Please try again." }, { status: 500 });
  }
}
