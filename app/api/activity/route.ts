import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TEMPO } from "@/lib/tempo";
import { symbolOf } from "@/lib/tokens";
import { incomingTransfers } from "@/lib/chain";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const me = await sql`select wallet_address from users where id = ${userId}`;
  const wallet = ((me[0]?.wallet_address as string) || "none").toLowerCase();

  const [rows, claims, ext]: any[] = await Promise.all([
    sql`
      select p.id, p.amount, p.memo, p.status, p.tx_hash, p.created_at, p.recipient_email, p.recipient_x, p.claim_status, p.token,
             p.recipient_address, p.sender_id, su.username as sender_username, ru.username as recipient_username
      from payments p
      join users su on su.id = p.sender_id
      left join users ru on lower(ru.wallet_address) = p.recipient_address
      where p.sender_id = ${userId} or p.recipient_address = ${wallet}
      order by p.created_at desc
      limit 50`,
    sql`select claim_tx from payments where claimed_by = ${userId} and claim_tx is not null`,
    incomingTransfers(wallet, new URL(req.url).searchParams.get("fresh") === "1"),
  ]);

  const paymentItems = rows.map((r: any) => {
    const sent = r.sender_id === userId;
    return {
      id: r.id,
      direction: sent ? "sent" : "received",
      amount: r.amount,
      memo: r.memo,
      status: r.status,
      txHash: r.tx_hash,
      createdAt: r.created_at,
      fromLabel: `@${r.sender_username}`,
      toLabel: r.recipient_username ? `@${r.recipient_username}` : r.recipient_x ? `@${r.recipient_x} (X)` : r.recipient_email || short(r.recipient_address),
      recipientEmail: sent ? r.recipient_email : null,
      claimable: sent && !!(r.recipient_email || r.recipient_x),
      claimStatus: r.claim_status,
      token: symbolOf(r.token),
    };
  });

  const known = new Set<string>(rows.map((r: any) => String(r.tx_hash).toLowerCase()));
  const claimSet = new Set<string>(claims.map((r: any) => String(r.claim_tx).toLowerCase()));
  const extItems = (ext as any[])
    .filter((x) => !known.has(x.hash))
    .map((x) => {
      const claimed = claimSet.has(x.hash);
      return {
        id: `x-${x.hash}-${x.logIndex}`,
        direction: "received",
        amount: String(x.amount),
        memo: claimed ? "Tip" : null,
        status: "CONFIRMED",
        txHash: x.hash,
        createdAt: new Date(x.ts).toISOString(),
        fromLabel: claimed ? "Claimed tip" : short(x.sender),
        toLabel: "You",
        recipientEmail: null,
        claimable: false,
        claimStatus: null,
        token: x.symbol,
      };
    });

  const items = [...paymentItems, ...extItems]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 80);

  return NextResponse.json({ items, explorer: TEMPO.explorer });
}
