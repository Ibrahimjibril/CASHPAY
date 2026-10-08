import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { parseUnits6 } from "@/lib/money";

const Body = z.object({ amount: z.string().max(30), memo: z.string().trim().max(140).optional() });

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const items = await sql`select id, amount, memo, status, created_at from payment_requests where requester_id = ${userId} order by created_at desc limit 20`;
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the details." }, { status: 400 });
  const amount = parsed.data.amount.trim();
  const units = parseUnits6(amount);
  if (!units || units <= BigInt(0)) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  try {
    const rows = await sql`insert into payment_requests (requester_id, amount, memo) values (${userId}, ${amount}, ${parsed.data.memo || null}) returning id`;
    return NextResponse.json({ id: rows[0].id });
  } catch {
    return NextResponse.json({ error: "Finish setting up your profile first." }, { status: 400 });
  }
}
