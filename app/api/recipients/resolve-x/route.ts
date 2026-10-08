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

  const recent = await sql`select count(*)::int as n from escrows where created_by = ${userId} and created_at > now() - interval '1 day'`;
  if (recent[0].n >= 30) return NextResponse.json({ error: "You've reached today's limit for new recipients." }, { status: 429 });

  try {
    const w = await getNodePrivy().wallets().create({ chain_type: "ethereum" });
    const address = String(w.address).toLowerCase();
    const rows = await sql`insert into escrows (created_by, handle, wallet_id, address) values (${userId}, ${handle}, ${w.id}, ${address}) returning id`;
    return NextResponse.json({ escrowId: rows[0].id, address, handle });
  } catch (e) {
    console.error("escrow create failed", e);
    return NextResponse.json({ error: "We couldn't prepare this tip. Please try again." }, { status: 500 });
  }
}
