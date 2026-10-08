import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import ClaimButton from "./ClaimButton";
import XClaim from "./XClaim";

export const dynamic = "force-dynamic";

export default async function Claim({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  const rows = await sql`
    select p.amount, p.memo, p.status, p.recipient_x, p.claim_status, p.claim_amount, u.username
    from payments p join users u on u.id = p.sender_id
    where p.id = ${id}`;
  const p = rows[0];
  if (!p) notFound();
  const amount = Number(p.amount).toFixed(2);
  const claimedAmount = p.claim_status === "CLAIMED" ? Number(p.claim_amount).toFixed(2) : null;
  return (
    <main className="wrap center">
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <p className="pill">{p.recipient_x ? `TIP FOR @${String(p.recipient_x).toUpperCase()}` : "YOU RECEIVED MONEY"}</p>
      <div className="amt">${amount}</div>
      <p className="small">From @{p.username}</p>
      {p.memo && <p className="lead">“{p.memo}”</p>}
      {p.status !== "CONFIRMED" && <p className="small">This payment is still being confirmed on Tempo.</p>}
      {p.recipient_x ? (
        <XClaim id={id} amount={amount} handle={p.recipient_x} claimedAmount={claimedAmount} />
      ) : (
        <ClaimButton amount={amount} />
      )}
    </main>
  );
}
