import nodemailer from "nodemailer";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export type EmailKind = "claim" | "received";

export async function sendEmailDetailed(
  to: string,
  p: { kind: EmailKind; amount: string; from: string; memo?: string | null; link: string }
): Promise<{ ok: boolean; error?: string }> {
  const claim = p.kind === "claim";
  const subject = `You received $${p.amount} from ${p.from} 💸`;
  const button = claim ? `Claim your $${p.amount}` : "Open CashPay";
  const note = claim
    ? "Sign in with this email address to see your money. No crypto experience needed."
    : "The money is already in your CashPay wallet.";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
    <h2 style="margin:0 0 8px">YOU RECEIVED $${esc(p.amount)} 💸</h2>
    <p>${esc(p.from)} sent you $${esc(p.amount)} through CashPay.</p>
    ${p.memo ? `<p style="color:#555">“${esc(p.memo)}”</p>` : ""}
    <p><a href="${esc(p.link)}" style="display:inline-block;background:#0E7C66;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:700">${esc(button)}</a></p>
    <p style="color:#777;font-size:13px">${esc(note)}</p>
  </div>`;
  const text = `${p.from} sent you $${p.amount} through CashPay.${p.memo ? `\n"${p.memo}"` : ""}\n\n${button}: ${p.link}\n\n${note}`;

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
      return { ok: true };
    } catch (e: any) {
      console.error("gmail send failed", e);
      return { ok: false, error: "Gmail: " + String(e?.message || e).slice(0, 200) };
    }
  }

  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "CashPay <onboarding@resend.dev>", to: [to], subject, html, text }),
    });
    if (!res.ok) return { ok: false, error: "Resend: " + (await res.text()).slice(0, 200) };
    return { ok: true };
  }
  return { ok: false, error: "Email isn't set up yet: GMAIL_USER / GMAIL_APP_PASSWORD are missing in Vercel." };
}
