import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getPrivy, getUserId } from "@/lib/auth";
import { getNodePrivy } from "@/lib/escrow";
import { CHAIN_ID, encodeTransfer, parseUnits6 } from "@/lib/money";
import { findTransfer, formatUnits, getReceipt, getTokenBalance, sleep } from "@/lib/tempo";

export const maxDuration = 30;

const Body = z.object({ id: z.string().regex(/^[0-9a-fA-F-]{36}$/) });

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "This claim link isn't valid." }, { status: 400 });
  const id = parsed.data.id;

  const rows = await sql`
    select p.amount, p.token, p.status, p.recipient_x, p.claim_status, p.claim_tx, p.claim_amount, e.wallet_id, e.address as escrow_address
    from payments p join escrows e on e.id = p.escrow_id
    where p.id = ${id}`;
  const p = rows[0];
  const tokenAddr = String(p?.token || "").toLowerCase();
  if (!p || !p.recipient_x) return NextResponse.json({ error: "This claim link isn't valid." }, { status: 404 });
  if (p.status !== "CONFIRMED") {
    return NextResponse.json({ error: "This payment is still being confirmed. Try again in a moment." }, { status: 409 });
  }

  const pu: any = await getPrivy().getUser(userId);
  const xName = String(pu?.twitter?.username || "").toLowerCase();
  if (xName !== p.recipient_x) {
    return NextResponse.json({ error: `This money was sent to @${p.recipient_x}. Please sign in with that X account.` }, { status: 403 });
  }

  const emb = (pu.linkedAccounts || []).find((a: any) => a.type === "wallet" && a.walletClientType === "privy");
  const dest: string | null = emb?.address ?? pu.wallet?.address ?? null;
  if (!dest) return NextResponse.json({ error: "Your wallet is still being created.", retry: true }, { status: 409 });
  const to = dest.toLowerCase();
  const escrow = String(p.escrow_address).toLowerCase();

  const received = (v: string) => formatUnits(parseUnits6(String(v)) ?? BigInt(0), 6, 2);
  if (p.claim_status === "CLAIMED") return NextResponse.json({ status: "CLAIMED", received: received(p.claim_amount ?? "0") });

  async function finalize(hash: string): Promise<"CLAIMED" | "FAILED" | "PENDING"> {
    for (let i = 0; i < 6; i++) {
      const r = await getReceipt(hash).catch(() => null);
      if (r) {
        if (r.status !== "0x1") return "FAILED";
        const v = findTransfer(r, tokenAddr, escrow, to);
        if (v === null) return "FAILED";
        await sql`update payments set claim_status = 'CLAIMED', claimed_at = now(), claim_amount = ${formatUnits(v, 6, 6)} where id = ${id}`;
        return "CLAIMED";
      }
      await sleep(1000);
    }
    return "PENDING";
  }
  const revert = () => sql`update payments set claim_status = null, claim_tx = null, claimed_by = null where id = ${id} and claim_status = 'CLAIMING'`;
  async function result(s: "CLAIMED" | "FAILED" | "PENDING") {
    if (s === "CLAIMED") {
      const r = await sql`select claim_amount from payments where id = ${id}`;
      return NextResponse.json({ status: "CLAIMED", received: received(r[0].claim_amount) });
    }
    if (s === "FAILED") {
      await revert();
      return NextResponse.json({ error: "We couldn't complete the claim. Please try again." }, { status: 502 });
    }
    return NextResponse.json({ status: "PENDING" }, { status: 202 });
  }

  if (p.claim_status === "CLAIMING") {
    if (p.claim_tx) return result(await finalize(String(p.claim_tx)));
    return NextResponse.json({ error: "This claim is already being processed. Please wait a moment." }, { status: 409 });
  }

  const lock = await sql`update payments set claim_status = 'CLAIMING', claimed_by = ${userId} where id = ${id} and claim_status is null returning id`;
  if (!lock[0]) return NextResponse.json({ error: "This claim is already being processed. Please wait a moment." }, { status: 409 });

  try {
    const bal = await getTokenBalance(tokenAddr, escrow);
    const want = parseUnits6(String(p.amount)) ?? BigInt(0);
    const units = want < bal ? want : bal;
    const reserve = parseUnits6(process.env.CLAIM_FEE_RESERVE || "0.02") ?? BigInt(20000);
    if (units <= reserve) {
      await revert();
      return NextResponse.json({ error: "This amount is too small to claim after the network fee." }, { status: 400 });
    }
    const out: any = await getNodePrivy().wallets().ethereum().sendTransaction(p.wallet_id, {
      caip2: `eip155:${CHAIN_ID}`,
      params: {
        transaction: {
          type: 118,
          fee_token: tokenAddr,
          calls: [{ to: tokenAddr, data: encodeTransfer(to, units - reserve) }],
        },
      },
    });
    const hash = String(out?.hash || "").toLowerCase();
    if (!hash) throw new Error("no hash");
    await sql`update payments set claim_tx = ${hash} where id = ${id}`;
    return result(await finalize(hash));
  } catch (e) {
    console.error("claim failed", e);
    await revert();
    return NextResponse.json({ error: "We couldn't complete the claim. Please try again." }, { status: 502 });
  }
}
