import { sql } from "@/lib/db";
import { sendEmailDetailed } from "@/lib/email";

const fmt = (a: string) => Number(a).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });

export async function notifyRecipient(origin: string, paymentId: string, force = false): Promise<{ ok: boolean; error?: string }> {
  const rows = await sql`
    select p.id, p.amount, p.memo, p.status, p.recipient_email, p.emailed,
           su.username as sender_username, ru.email as user_email
    from payments p
    join users su on su.id = p.sender_id
    left join users ru on ru.id = p.recipient_user_id
    where p.id = ${paymentId}`;
  const p = rows[0];
  if (!p) return { ok: false, error: "Payment not found." };
  if (p.status !== "CONFIRMED") return { ok: false, error: "This payment isn't confirmed yet." };
  const claim = !!p.recipient_email;
  const to: string | null = p.recipient_email || p.user_email || null;
  if (!to) return { ok: false, error: "We don't have an email address for this recipient." };
  if (p.emailed && !force) return { ok: true };
  const r = await sendEmailDetailed(to, {
    kind: claim ? "claim" : "received",
    amount: fmt(p.amount),
    from: `@${p.sender_username}`,
    memo: p.memo,
    bannerUrl: `${origin}/api/email-banner?id=${p.id}`,
    link: claim ? `${origin}/claim/${p.id}` : `${origin}/dashboard`,
  });
  if (r.ok) await sql`update payments set emailed = true where id = ${paymentId}`;
  return r;
}
