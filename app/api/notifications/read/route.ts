import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  await sql`update users set notifications_read_at = now() where id = ${userId}`;
  return NextResponse.json({ ok: true });
}
