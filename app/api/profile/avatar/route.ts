import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";

const Body = z.object({ image: z.string().max(220000) });

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please choose a smaller photo." }, { status: 400 });
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(parsed.data.image);
  if (!m) return NextResponse.json({ error: "Please choose a valid photo." }, { status: 400 });
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 200 || buf.length > 150000 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
    return NextResponse.json({ error: "Please choose a valid photo." }, { status: 400 });
  }
  await sql`update users set avatar_url = ${parsed.data.image} where id = ${userId}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  await sql`update users set avatar_url = null where id = ${userId}`;
  return NextResponse.json({ ok: true });
}
