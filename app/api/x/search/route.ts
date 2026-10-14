import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { xSearch } from "@/lib/xapi";
import { allow } from "@/lib/ratelimit";

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!allow(`xs:${userId}`, 30, 60000)) {
    return NextResponse.json({ users: [], error: "Too many searches. Please wait a moment." });
  }
  const q = new URL(req.url).searchParams.get("q") || "";
  const res = await xSearch(q);

  const linked: Record<string, string> = {};
  if (res.users.length) {
    const ids = res.users.map((u) => u.id);
    const rows = await sql`select x_id, username from users where x_id = any(${ids}::text[]) and status = 'active'`;
    for (const r of rows as any[]) linked[r.x_id] = r.username;
  }
  return NextResponse.json({
    users: res.users.map((u) => ({ ...u, cashpay: linked[u.id] || null })),
    exactOnly: !!res.exactOnly,
    error: res.error || null,
  });
}
