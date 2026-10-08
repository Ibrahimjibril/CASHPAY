import nodemailer from "nodemailer";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export async function sendClaimEmail(
  to: string,
  p: { amount: string; from: string; memo?: string | null; link: string }
): Promise<boolean> {
  const subject = `You received $${p.amount} from ${p.from} 💸`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
    <h2 style="margin:0 0 8px">YOU RECEIVED $${esc(p.amount)} 💸</h2>
    <p>${esc(p.from)} sent you $${esc(p.amount)} through CashPay.</p>
    ${p.memo ? `<p style="color:#555">“${esc(p.memo)}”</p>` : ""}
    <p><a href="${esc(p.link)}" style="display:inline-block;background:#0E7C66;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:700">Claim your $${esc(p.amount)}</a></p>
    <p style="color:#777;font-size:13px">Sign in with this email address to see your money. No crypto experience needed.</p>
  </div>`;
  const text = `${p.from} sent you $${p.amount} through CashPay.${p.memo ? `\n"${p.memo}"` : ""}\n\nClaim your money: ${p.link}\n\nSign in with this email address to see your money.`;

  const gUser = process.env.GMAIL_USER;
  const gPass = process.env.GMAIL_APP_PASSWORD;
  if (gUser && gPass) {
    try {
      const t = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gUser, pass: gPass.replace(/\s/g, "") },
      });
      await t.sendMail({ from: `CashPay <${gUser}>`, to, subject, html, text });
      return true;
    } catch (e) {
      console.error("gmail send failed", e);
      return false;
    }
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "CashPay <onboarding@resend.dev>", to: [to], subject, html, text }),
  });
  return res.ok;
}
