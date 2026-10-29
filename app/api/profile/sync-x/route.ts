import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getPrivy, getUserId } from "@/lib/auth";

// Which X account (if any) is linked to this CashPay wallet
export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const rows = await sql`select x_username from users where id = ${userId}`;
    return NextResponse.json({ x: rows[0]?.x_username ? { username: rows[0].x_username } : null });
  } catch {
    return NextResponse.json({ x: null });
  }
}

// Links the X account that Privy verified through OAuth. The X id/username never come from the browser.
// Automatic syncs are skipped when the person switched the link Off; the "On" switch sends force: true.
export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body: any = await req.json().catch(() => ({}));
  const force = body?.force === true;
  if (!force) {
    try {
      const o = await sql`select x_optout from users where id = ${userId}`;
      if (o[0]?.x_optout) return NextResponse.json({ x: null, skipped: true });
    } catch {}
  }
  const pu: any = await getPrivy().getUser(userId);
  const tw = pu?.twitter;
  if (!tw?.subject) return NextResponse.json({ error: "No X account is linked to your login yet." }, { status: 400 });
  const handle = String(tw.username || "").toLowerCase() || null;
  try {
    // an old, stale owner of this handle must not keep receiving its tips
    if (handle) await sql`update users set x_username = null where x_username = ${handle} and id <> ${userId}`;
    const rows = await sql`
      update users set x_id = ${String(tw.subject)}, x_username = ${handle}, x_optout = false
      where id = ${userId}
      returning x_username`;
    if (!rows[0]) return NextResponse.json({ error: "Finish setting up your profile first." }, { status: 404 });
    return NextResponse.json({ x: { username: rows[0].x_username } });
  } catch (e: any) {
    if (e?.code === "23505") return NextResponse.json({ error: "This X account is already linked to another CashPay user." }, { status: 409 });
    console.error("sync-x failed", e);
    return NextResponse.json({ error: "We couldn't link your X account. Please try again." }, { status: 500 });
  }
}

// Turns direct tips Off (tips to that handle use claim links again). The X sign-in itself is not touched.
export async function DELETE(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    await sql`update users set x_id = null, x_username = null, x_optout = true where id = ${userId}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "We couldn't turn it off." }, { status: 500 });
  }
}
