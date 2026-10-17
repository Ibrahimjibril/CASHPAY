import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import ClaimButton from "./ClaimButton";
import XClaim from "./XClaim";
import EmailClaim from "./EmailClaim";

export const dynamic = "force-dynamic";

export default async function Claim({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  const rows = await sql`
    select p.amount, p.memo, p.status, p.recipient_x, p.recipient_email, p.escrow_id, p.claim_status, p.claim_amount,
           coalesce(p.expires_at, p.created_at + interval '30 days') as expires, u.username
    from payments p join users u on u.id = p.sender_id
    where p.id = ${id}`;
  const p = rows[0];
  if (!p) notFound();

  const amount = Number(p.amount).toFixed(2);
  const claimedAmount = p.claim_status === "CLAIMED" ? Number(p.claim_amount).toFixed(2) : null;
  const refunded = p.claim_status === "REFUNDED" || p.claim_status === "REFUNDING";
  const exp = new Date(p.expires).getTime();
  const expired = !!p.escrow_id && !claimedAmount && !refunded && exp < Date.now();
  const daysLeft = Math.max(0, Math.ceil((exp - Date.now()) / 86400000));
  const until = new Date(exp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="wrap center">
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <p className="pill">{p.recipient_x ? `TIP FOR @${String(p.recipient_x).toUpperCase()}` : "YOU RECEIVED MONEY"}</p>
      <div className="amt">${amount}</div>
      <p className="small">From @{p.username}</p>
      {p.memo && <p className="lead">“{p.memo}”</p>}
      {p.status !== "CONFIRMED" && <p className="small">This payment is still being confirmed on Tempo.</p>}

      {refunded || expired ? (
        <p className="lead">This claim link has expired. The money {refunded ? "was returned" : "is being returned"} to the sender.</p>
      ) : (
        <>
          {p.escrow_id && !claimedAmount && <p className="small">Claim it within {daysLeft} {daysLeft === 1 ? "day" : "days"} (by {until}). Unclaimed money returns to the sender.</p>}
          {p.recipient_x ? (
            <XClaim id={id} amount={amount} handle={p.recipient_x} claimedAmount={claimedAmount} />
          ) : p.escrow_id && p.recipient_email ? (
            <EmailClaim id={id} amount={amount} claimedAmount={claimedAmount} />
          ) : (
            <ClaimButton amount={amount} />
          )}
        </>
      )}
    </main>
  );
}
