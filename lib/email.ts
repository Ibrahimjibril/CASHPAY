const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export async function sendClaimEmail(
  to: string,
  p: { amount: string; from: string; memo?: string | null; link: string }
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
    <h2 style="margin:0 0 8px">YOU RECEIVED $${esc(p.amount)} 💸</h2>
    <p>${esc(p.from)} sent you $${esc(p.amount)} through CashPay.</p>
    ${p.memo ? `<p style="color:#555">“${esc(p.memo)}”</p>` : ""}
    <p><a href="${esc(p.link)}" style="display:inline-block;background:#0E7C66;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:700">Claim your $${esc(p.amount)}</a></p>
    <p style="color:#777;font-size:13px">Sign in with this email address to see your money. No crypto experience needed.</p>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "CashPay <onboarding@resend.dev>",
      to: [to],
      subject: `You received $${p.amount} from ${p.from} 💸`,
      html,
    }),
  });
  return res.ok;
}
