import { sql } from "@/lib/db";

export async function markRequestPaid(requestId: string, paymentId: string) {
  await sql`update payment_requests set status = 'PAID', paid_payment_id = ${paymentId}
    where id = ${requestId} and status = 'OPEN'
      and requester_id = (select recipient_user_id from payments where id = ${paymentId})`;
}
