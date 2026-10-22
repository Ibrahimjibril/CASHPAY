import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const r = await sql`select count(*)::int as n from passkeys where user_id = ${userId}`;
    return NextResponse.json({ enrolled: r[0].n > 0, count: r[0].n });
  } catch {
    return NextResponse.json({ enrolled: false, count: 0 });
  }
}
