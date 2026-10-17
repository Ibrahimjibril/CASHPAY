import { sql } from "@/lib/db";
import { getNodePrivy } from "@/lib/escrow";
import { CHAIN_ID, encodeTransfer, parseUnits6 } from "@/lib/money";
import { findTransfer, formatUnits, getReceipt, getTokenBalance, sleep } from "@/lib/tempo";

export type RefundResult = { ok: boolean; status?: "REFUNDED" | "PENDING" | "NOTHING"; error?: string };

// Returns an unclaimed, expired escrow payment to the sender's wallet (minus the network fee reserve).
// requesterId: when given, only that sender may trigger it.
export async function refundPayment(id: string, requesterId?: string): Promise<RefundResult> {
  const rows = await sql`
    select p.id, p.sender_id, p.amount, p.token, p.status, p.claim_status, p.refund_tx,
           coalesce(p.expires_at, p.created_at + interval '30 days') as expires,
           e.wallet_id, e.address as escrow_address, su.wallet_address as sender_wallet
    from payments p
    join escrows e on e.id = p.escrow_id
    join users su on su.id = p.sender_id
    where p.id = ${id}`;
  const p = rows[0];
  if (!p) return { ok: false, error: "Payment not found." };
  if (requesterId && p.sender_id !== requesterId) return { ok: false, error: "Payment not found." };
  if (p.status !== "CONFIRMED") return { ok: false, error: "This payment isn't confirmed yet." };
  if (!p.sender_wallet) return { ok: false, error: "The sender's wallet isn't ready." };
  if (p.claim_status === "CLAIMED" || p.claim_status === "CLAIMING") return { ok: false, error: "This money was already claimed." };
  if (p.claim_status === "REFUNDED") return { ok: true, status: "REFUNDED" };
  if (new Date(p.expires).getTime() > Date.now()) return { ok: false, error: "This payment hasn't expired yet." };

  const tokenAddr = String(p.token).toLowerCase();
  const escrow = String(p.escrow_address).toLowerCase();
  const to = String(p.sender_wallet).toLowerCase();

  async function finalize(hash: string): Promise<"REFUNDED" | "FAILED" | "PENDING"> {
    for (let i = 0; i < 6; i++) {
      const r = await getReceipt(hash).catch(() => null);
      if (r) {
        if (r.status !== "0x1") return "FAILED";
        const v = findTransfer(r, tokenAddr, escrow, to);
        if (v === null) return "FAILED";
        await sql`update payments set claim_status = 'REFUNDED', refunded_at = now(), refund_amount = ${formatUnits(v, 6, 6)} where id = ${id}`;
        return "REFUNDED";
      }
      await sleep(1000);
    }
    return "PENDING";
  }
  const revert = () => sql`update payments set claim_status = null, refund_tx = null where id = ${id} and claim_status = 'REFUNDING'`;

  if (p.claim_status === "REFUNDING") {
    if (!p.refund_tx) return { ok: false, error: "A refund is already in progress." };
    const s = await finalize(String(p.refund_tx));
    if (s === "FAILED") { await revert(); return { ok: false, error: "The refund failed and will be retried." }; }
    return { ok: true, status: s === "REFUNDED" ? "REFUNDED" : "PENDING" };
  }

  const lock = await sql`update payments set claim_status = 'REFUNDING' where id = ${id} and claim_status is null returning id`;
  if (!lock[0]) return { ok: false, error: "A refund is already in progress." };

  try {
    const bal = await getTokenBalance(tokenAddr, escrow);
    const want = parseUnits6(String(p.amount)) ?? BigInt(0);
    const units = want < bal ? want : bal;
    const reserve = parseUnits6(process.env.CLAIM_FEE_RESERVE || "0.02") ?? BigInt(20000);
    if (units <= reserve) {
      await sql`update payments set claim_status = 'REFUNDED', refunded_at = now(), refund_amount = 0 where id = ${id}`;
      return { ok: true, status: "NOTHING" };
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
    await sql`update payments set refund_tx = ${hash} where id = ${id}`;
    const s = await finalize(hash);
    if (s === "FAILED") { await revert(); return { ok: false, error: "The refund failed and will be retried." }; }
    return { ok: true, status: s === "REFUNDED" ? "REFUNDED" : "PENDING" };
  } catch (e) {
    console.error("refund failed", e);
    await revert();
    return { ok: false, error: "We couldn't return the money right now. It will be retried." };
  }
}
