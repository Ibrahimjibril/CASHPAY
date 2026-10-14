import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getNodePrivy } from "@/lib/escrow";
import { xById, xByUsername, xConfigured, type XUser } from "@/lib/xapi";
import { allow } from "@/lib/ratelimit";

const Body = z.object({
  xId: z.string().regex(/^\d{1,20}$/).optional(),
  handle: z.string().trim().toLowerCase().regex(/^@?[a-z0-9_]{1,15}$/).optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!allow(`rx:${userId}`, 20, 60000)) return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.xId && !parsed.data.handle)) {
    return NextResponse.json({ error: "Enter a valid X username." }, { status: 400 });
  }

  // 1) Identify the account with the official X API (so we bind the payment to the permanent X user ID)
  let xu: XUser | null = null;
  let handle = "";
  if (xConfigured()) {
    const r = parsed.data.xId ? await xById(parsed.data.xId) : await xByUsername(parsed.data.handle!);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 502 });
    if (!r.user) return NextResponse.json({ error: "We couldn't find that X account." }, { status: 404 });
    xu = r.user;
    handle = xu.username.toLowerCase();
  } else {
    if (!parsed.data.handle) return NextResponse.json({ error: "X search isn't set up yet." }, { status: 400 });
    handle = parsed.data.handle.replace(/^@/, "");
  }

  // 2) If this X account is already linked to a CashPay wallet, pay that wallet directly
  if (xu) {
    const linked = await sql`select id, username, wallet_address from users where x_id = ${xu.id} and status = 'active' and wallet_address is not null limit 1`;
    if (linked[0]) {
      if (linked[0].id === userId) return NextResponse.json({ error: "You can't send money to yourself." }, { status: 400 });
      return NextResponse.json({ kind: "user", username: linked[0].username, address: linked[0].wallet_address, handle, x: xu });
    }
  }

  // 3) Otherwise create a one-time escrow wallet that only this X account can claim
  const recent = await sql`select count(*)::int as n from escrows where created_by = ${userId} and created_at > now() - interval '1 day'`;
  if (recent[0].n >= 30) return NextResponse.json({ error: "You've reached today's limit for new recipients." }, { status: 429 });

  try {
    const w = await getNodePrivy().wallets().create({ chain_type: "ethereum" });
    const address = String(w.address).toLowerCase();
    const rows = await sql`
      insert into escrows (created_by, handle, wallet_id, address, x_id, x_name, x_avatar)
      values (${userId}, ${handle}, ${w.id}, ${address}, ${xu?.id ?? null}, ${xu?.name ?? null}, ${xu?.avatar ?? null})
      returning id`;
    return NextResponse.json({ kind: "escrow", escrowId: rows[0].id, address, handle, x: xu, legacy: !xu });
  } catch (e) {
    console.error("escrow create failed", e);
    return NextResponse.json({ error: "We couldn't prepare this tip. Please try again." }, { status: 500 });
  }
}
