import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getPrivy, getUserId } from "@/lib/auth";

// Which X account (if any) is linked to this CashPay wallet
export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const rows = await sql`select x_username from users where id = ${userId}`;
  return NextResponse.json({ x: rows[0]?.x_username ? { username: rows[0].x_username } : null });
}

// Links the X account that Privy verified through OAuth. The X id/username never come from the browser.
export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const pu: any = await getPrivy().getUser(userId);
  const tw = pu?.twitter;
  if (!tw?.subject) return NextResponse.json({ error: "No X account is linked yet." }, { status: 400 });
  try {
    const rows = await sql`
      update users set x_id = ${String(tw.subject)}, x_username = ${String(tw.username || "").toLowerCase() || null}
      where id = ${userId}
      returning x_username`;
    if (!rows[0]) return NextResponse.json({ error: "Finish setting up your profile first." }, { status: 404 });
    return NextResponse.json({ x: { username: rows[0].x_username } });
  } catch (e: any) {
    if (e?.code === "23505") return NextResponse.json({ error: "This X account is already linked to another CashPay user." }, { status: 409 });
    return NextResponse.json({ error: "We couldn't link your X account." }, { status: 500 });
  }
}
