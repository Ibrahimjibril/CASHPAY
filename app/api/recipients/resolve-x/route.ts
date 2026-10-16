import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getNodePrivy } from "@/lib/escrow";

const Body = z.object({ handle: z.string().trim().toLowerCase().regex(/^@?[a-z0-9_]{1,15}$/) });

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid X username." }, { status: 400 });
  const handle = parsed.data.handle.replace(/^@/, "");

  // If this X account is linked to a CashPay wallet, the money goes straight to that wallet (no claim needed)
  try {
    const linked = await sql`
      select id, username, display_name, wallet_address from users
      where x_username = ${handle} and status = 'active' and wallet_address is not null
      limit 1`;
    if (linked[0]) {
      if (linked[0].id === userId) return NextResponse.json({ error: "You can't send money to yourself." }, { status: 400 });
      return NextResponse.json({
        kind: "user",
        username: linked[0].username,
        name: linked[0].display_name,
        address: linked[0].wallet_address,
        handle,
      });
    }
  } catch {
    // the x_username column may not exist yet: fall through to the claim-link flow
  }

  // Otherwise: a one-time escrow wallet that the owner of this X account can claim
  const recent = await sql`select count(*)::int as n from escrows where created_by = ${userId} and created_at > now() - interval '1 day'`;
  if (recent[0].n >= 30) return NextResponse.json({ error: "You've reached today's limit for new recipients." }, { status: 429 });

  try {
    const w = await getNodePrivy().wallets().create({ chain_type: "ethereum" });
    const address = String(w.address).toLowerCase();
    const rows = await sql`insert into escrows (created_by, handle, wallet_id, address) values (${userId}, ${handle}, ${w.id}, ${address}) returning id`;
    return NextResponse.json({ kind: "escrow", escrowId: rows[0].id, address, handle });
  } catch (e) {
    console.error("escrow create failed", e);
    return NextResponse.json({ error: "We couldn't prepare this tip. Please try again." }, { status: 500 });
  }
}
