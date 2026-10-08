import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import PayButton from "./PayButton";

export const dynamic = "force-dynamic";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  const rows = await sql`
    select r.amount, r.memo, r.status, u.username, u.display_name
    from payment_requests r join users u on u.id = r.requester_id
    where r.id = ${id}`;
  const r = rows[0];
  if (!r) notFound();
  const amount = Number(r.amount).toFixed(2);
  const url = `/send?u=${encodeURIComponent(r.username)}&amount=${encodeURIComponent(String(Number(r.amount)))}&memo=${encodeURIComponent(r.memo || "")}&request=${id}`;
  return (
    <main className="wrap center">
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <p className="pill">{String(r.display_name).toUpperCase()} REQUESTED</p>
      <div className="amt">${amount}</div>
      <p className="small">@{r.username}</p>
      {r.memo && <p className="lead">“{r.memo}”</p>}
      {r.status === "OPEN" ? <PayButton url={url} amount={amount} /> : <p className="ok">✓ This request has been paid.</p>}
    </main>
  );
}
