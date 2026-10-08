import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import ClaimButton from "./ClaimButton";

export const dynamic = "force-dynamic";

export default async function Claim({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  const rows = await sql`
    select p.amount, p.memo, p.status, u.username
    from payments p join users u on u.id = p.sender_id
    where p.id = ${id}`;
  const p = rows[0];
  if (!p) notFound();
  const amount = Number(p.amount).toFixed(2);
  return (
    <main className="wrap center">
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <p className="pill">YOU RECEIVED MONEY</p>
      <div className="amt">${amount}</div>
      <p className="small">From @{p.username}</p>
      {p.memo && <p className="lead">“{p.memo}”</p>}
      {p.status !== "CONFIRMED" && <p className="small">This payment is still being confirmed on Tempo.</p>}
      <ClaimButton amount={amount} />
    </main>
  );
}
