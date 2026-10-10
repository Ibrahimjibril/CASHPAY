import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { symbolOf } from "@/lib/tokens";
import BatchClaim from "./BatchClaim";

export const dynamic = "force-dynamic";

export default async function BatchPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) notFound();
  const rows: any[] = await sql`
    select p.amount, p.status, p.recipient_x, p.token, p.claim_status, p.leg,
           su.username as sender, ru.username as recipient_username
    from payments p
    join users su on su.id = p.sender_id
    left join users ru on lower(ru.wallet_address) = p.recipient_address
    where p.tx_hash = ${hash.toLowerCase()}
    order by p.leg`;
  if (!rows.length) notFound();

  const total = rows.reduce((a, r) => a + Number(r.amount), 0).toFixed(2);
  const sym = symbolOf(rows[0].token);
  const hasX = rows.some((r) => r.recipient_x);

  return (
    <main className="wrap center">
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <p className="pill">{`TIPS FOR ${rows.length} PEOPLE`}</p>
      <div className="amt">${total}</div>
      <p className="small">From @{rows[0].sender} · {sym}</p>
      <div className="list">
        {rows.map((r, i) => {
          const label = r.recipient_x ? `@${r.recipient_x}` : r.recipient_username ? `@${r.recipient_username}` : "Email or wallet recipient";
          const state = r.recipient_x
            ? r.claim_status === "CLAIMED" ? "✓ Claimed" : r.status === "CONFIRMED" ? "Waiting" : "Confirming"
            : r.status === "CONFIRMED" ? "✓ Sent" : "Confirming";
          return (
            <div key={i} className="act" style={{ cursor: "default" }}>
              <span><b>{label}</b><span className="small" style={{ display: "block" }}>{state}</span></span>
              <b>${Number(r.amount).toFixed(2)}</b>
            </div>
          );
        })}
      </div>
      {hasX ? <BatchClaim hash={hash.toLowerCase()} /> : <a className="btn primary" href="/login">Open CashPay</a>}
    </main>
  );
}
