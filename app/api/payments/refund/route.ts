import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { refundPayment } from "@/lib/refund";

export const maxDuration = 30;

const Body = z.object({ id: z.string().regex(/^[0-9a-fA-F-]{36}$/) });

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment." }, { status: 400 });
  const r = await refundPayment(parsed.data.id, userId);
  if (!r.ok) return NextResponse.json({ error: r.error || "We couldn't return the money." }, { status: 400 });
  return NextResponse.json({ status: r.status });
}
