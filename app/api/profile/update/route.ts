import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

const Body = z.object({
  displayName: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(160).optional(),
});

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your details." }, { status: 400 });
  const rows = await sql`
    update users set display_name = ${parsed.data.displayName}, bio = ${parsed.data.bio || null}
    where id = ${userId}
    returning username, display_name, bio, wallet_address`;
  if (!rows[0]) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  return NextResponse.json({ profile: rows[0] });
}
