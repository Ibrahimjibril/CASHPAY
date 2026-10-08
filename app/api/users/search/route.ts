import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") || "").toLowerCase().replace(/[^a-z0-9_ ]/g, "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] });
  const users = await sql`
    select username, display_name, wallet_address from users
    where status = 'active' and wallet_address is not null and id <> ${userId}
      and (lower(username) like ${q + "%"} or lower(display_name) like ${"%" + q + "%"})
    order by (lower(username) = ${q}) desc, username
    limit 6`;
  return NextResponse.json({ users });
}
