import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalize, validUsername } from "@/lib/username";

export async function GET(req: Request) {
  const u = normalize(new URL(req.url).searchParams.get("u") || "");
  if (!validUsername(u)) return NextResponse.json({ valid: false, available: false });
  const rows = await sql`select 1 from users where lower(username) = ${u}`;
  return NextResponse.json({ valid: true, available: rows.length === 0 });
}
