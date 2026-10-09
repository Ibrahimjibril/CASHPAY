import nodemailer from "nodemailer";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export type EmailKind = "claim" | "received";
type P = { kind: EmailKind; amount: string; from: string; memo?: string | null; link: string; bannerUrl?: string; xIconUrl?: string };

function buildHtml(p: P) {
  const claim = p.kind === "claim";
  const button = claim ? `Claim your $${p.amount}` : "Open CashPay";
  const note = claim
    ? "Sign in with this email address to see your money. No crypto experience needed."
    : "The money is already in your CashPay wallet.";
  const banner = p.bannerUrl
    ? `<tr><td style="padding:0;font-size:0;line-height:0"><img src="${esc(p.bannerUrl)}" width="600" alt="${esc(`${p.from} sent you $${p.amount} on CashPay`)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none"></td></tr>`
    : "";
  const memo = p.memo
    ? `<p style="margin:16px 0 0;padding:12px 16px;border-left:3px solid #19e3a5;background:#0e2a44;border-radius:8px;color:#eaf2f8;font-size:15px;line-height:1.5">“${esc(p.memo)}”</p>`
    : "";
  const copy = claim
    ? `<tr><td align="center" style="padding:4px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8ba2b6">Button not working? Copy this link:<br><a href="${esc(p.link)}" style="color:#19e3a5;word-break:break-all">${esc(p.link)}</a></td></tr>`
    : "";
  const xbtn = p.xIconUrl
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 14px"><tr><td><a href="https://x.com/CashPaya" target="_blank" style="text-decoration:none"><img src="${esc(p.xIconUrl)}" width="44" height="44" alt="X" style="display:block;border:0"></a></td></tr></table>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
</head>
<body style="margin:0;padding:0;background:#06101d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#06101d" style="background:#06101d">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#0b1f36" style="width:100%;max-width:600px;background:#0b1f36;border-radius:24px;overflow:hidden;border:1px solid #143049">
${banner}
<tr><td style="padding:30px 32px 6px;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
<h1 style="margin:0 0 10px;font-size:26px;line-height:1.25;color:#ffffff;font-weight:800">You received $${esc(p.amount)}</h1>
<p style="margin:0;font-size:16px;line-height:1.6;color:#d5e3ec">${esc(p.from)} sent you $${esc(p.amount)} through CashPay.</p>
${memo}
</td></tr>
<tr><td align="center" style="padding:26px 32px 10px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td bgcolor="#19e3a5" style="border-radius:14px;background:#19e3a5">
<a href="${esc(p.link)}" style="display:inline-block;padding:17px 40px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#04241b;text-decoration:none;border-radius:14px">${esc(button)} &rarr;</a>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:10px 32px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#8ba2b6">${esc(note)}</td></tr>
${copy}
<tr><td style="padding:22px 32px 28px;font-family:Arial,Helvetica,sans-serif">
<div style="border-top:1px solid #143049;margin:0 0 16px;font-size:0;line-height:0">&nbsp;</div>
${xbtn}
<p style="margin:0;text-align:center;font-size:12px;line-height:1.7;color:#6f879b"><b style="color:#19e3a5">CashPay</b> &middot; Money for the social internet<br>Powered by Tempo</p>
<p style="margin:10px 0 0;text-align:center;font-size:11px;line-height:1.6;color:#6f879b">You are receiving this email because ${esc(p.from)} sent you a payment on CashPay.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function viaResend(key: string, from: string, to: string, subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) return { ok: false, error: "Resend: " + (await res.text()).slice(0, 200) };
  return { ok: true as const };
}

export async function sendEmailDetailed(to: string, p: P): Promise<{ ok: boolean; error?: string }> {
  const claim = p.kind === "claim";
  const subject = `${p.from} sent you a payment on CashPay`;
  const button = claim ? `Claim your $${p.amount}` : "Open CashPay";
  const note = claim ? "Sign in with this email address to see your money." : "The money is already in your CashPay wallet.";
  const html = buildHtml(p);
  const text = `${p.from} sent you $${p.amount} through CashPay.${p.memo ? `\n"${p.memo}"` : ""}\n\n${button}: ${p.link}\n\n${note}\n\nYou are receiving this email because ${p.from} sent you a payment on CashPay.`;

  // 1) Own domain through Resend (best deliverability) when both variables are set
  const rKey = process.env.RESEND_API_KEY;
  const rFrom = process.env.EMAIL_FROM;
  if (rKey && rFrom) return viaResend(rKey, rFrom, to, subject, html, text);

  // 2) Gmail SMTP fallback
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
      await t.sendMail({ from: `CashPay <${gUser}>`, replyTo: gUser, to, subject, html, text });
      return { ok: true };
    } catch (e: any) {
      console.error("gmail send failed", e);
      return { ok: false, error: "Gmail: " + String(e?.message || e).slice(0, 200) };
    }
  }

  // 3) Resend sandbox sender (only delivers to your own address)
  if (rKey) return viaResend(rKey, "CashPay <onboarding@resend.dev>", to, subject, html, text);
  return { ok: false, error: "Email isn't set up yet: GMAIL_USER / GMAIL_APP_PASSWORD are missing in Vercel." };
}
