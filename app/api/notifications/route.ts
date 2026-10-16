import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { incomingTransfers } from "@/lib/chain";

const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const me = await sql`select wallet_address, created_at, notifications_read_at from users where id = ${userId}`;
  if (!me[0]) return NextResponse.json({ items: [], unread: 0 });
  const w = ((me[0].wallet_address as string) || "none").toLowerCase();
  const readAt = new Date(me[0].notifications_read_at ?? me[0].created_at).getTime();

  const [recv, claimed, mine, ext]: any[] = await Promise.all([
    sql`select p.id, p.amount, p.memo, p.created_at, p.tx_hash, su.username as sender
        from payments p join users su on su.id = p.sender_id
        where p.recipient_address = ${w} and p.sender_id <> ${userId} and p.status = 'CONFIRMED'
        order by p.created_at desc limit 20`,
    sql`select p.id, p.amount, p.recipient_x, p.claimed_at
        from payments p
        where p.sender_id = ${userId} and p.claim_status = 'CLAIMED' and p.claimed_at is not null
        order by p.claimed_at desc limit 20`,
    sql`select claim_tx from payments where claimed_by = ${userId} and claim_tx is not null`,
    incomingTransfers(w, new URL(req.url).searchParams.get("fresh") === "1"),
  ]);

  const skip = new Set<string>();
  for (const r of recv) skip.add(String(r.tx_hash).toLowerCase());
  for (const r of mine) skip.add(String(r.claim_tx).toLowerCase());
  const extItems = (ext as any[])
    .filter((x) => !skip.has(x.hash) && x.ts > readAt - 7 * 86400000)
    .slice(0, 20)
    .map((x) => ({ id: `x-${x.hash}-${x.logIndex}`, kind: "payRecv", who: short(x.sender), amount: x.amount, ts: x.ts }));

  const items = [
    ...recv.map((r: any) => ({
      id: `r-${r.id}`, kind: String(r.memo || "").startsWith("Tip") ? "tipRecv" : "payRecv",
      who: `@${r.sender}`, amount: Number(r.amount), ts: new Date(r.created_at).getTime(),
    })),
    ...claimed.map((r: any) => ({
      id: `c-${r.id}`, kind: "tipClaimed", who: `@${r.recipient_x}`, amount: Number(r.amount), ts: new Date(r.claimed_at).getTime(),
    })),
    ...extItems,
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 20)
    .map((n) => ({ ...n, unread: n.ts > readAt }));

  return NextResponse.json({ items, unread: items.filter((n) => n.unread).length });
}
