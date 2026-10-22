import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getPrivy, getUserId } from "@/lib/auth";

// "I can't use my fingerprint": allowed only right after a fresh sign-in (email, Google or X)
export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const pu: any = await getPrivy().getUser(userId);
  const latest = Math.max(0, ...(pu?.linkedAccounts || []).map((a: any) => new Date(a?.latestVerifiedAt || a?.verifiedAt || 0).getTime()));
  if (Date.now() - latest > 10 * 60 * 1000) {
    return NextResponse.json({ error: "Please sign in again, then try again." }, { status: 403 });
  }
  await sql`delete from passkeys where user_id = ${userId}`;
  return NextResponse.json({ ok: true });
}
