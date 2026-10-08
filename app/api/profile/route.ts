import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getPrivy, getUserId } from "@/lib/auth";
import { normalize, validUsername } from "@/lib/username";

const Body = z.object({
  username: z.string().max(40),
  displayName: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(160).optional(),
});

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const rows = await sql`select username, display_name, bio, wallet_address from users where id = ${userId}`;
  return NextResponse.json({ profile: rows[0] ?? null });
}

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your details." }, { status: 400 });

  const username = normalize(parsed.data.username);
  if (!validUsername(username)) {
    return NextResponse.json({ error: "Use 3–20 letters, numbers or _." }, { status: 400 });
  }

  const pu = await getPrivy().getUser(userId);
  const email = pu.google?.email ?? pu.email?.address ?? null;
  const wallet = pu.wallet?.address ?? null;
  const bio = parsed.data.bio || null;

  try {
    const rows = await sql`
      insert into users (id, email, username, display_name, bio, wallet_address)
      values (${userId}, ${email}, ${username}, ${parsed.data.displayName}, ${bio}, ${wallet})
      returning username, display_name, bio, wallet_address`;
    return NextResponse.json({ profile: rows[0] });
  } catch (e: any) {
    if (e?.code === "23505") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
