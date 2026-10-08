import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { notifyRecipient } from "@/lib/notify";

const Body = z.object({ id: z.string().regex(/^[0-9a-fA-F-]{36}$/) });

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ ok: false, error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payment." }, { status: 400 });
  const rows = await sql`select sender_id from payments where id = ${parsed.data.id}`;
  if (!rows[0] || rows[0].sender_id !== userId) return NextResponse.json({ ok: false, error: "Payment not found." }, { status: 404 });
  const r = await notifyRecipient(new URL(req.url).origin, parsed.data.id, true);
  return NextResponse.json(r);
}
