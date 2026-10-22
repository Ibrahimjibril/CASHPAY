import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// Turning the lock off needs a fingerprint check in the last 2 minutes
export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const rows = await sql`
    delete from passkeys
    where user_id = ${userId}
      and exists (select 1 from passkeys p2 where p2.user_id = ${userId} and p2.last_used_at > now() - interval '2 minutes')
    returning id`;
  if (!rows.length) return NextResponse.json({ error: "Confirm your fingerprint first, then try again." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
