import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TEMPO, getTokenBalance, formatUnits } from "@/lib/tempo";
import { OUSD_ADDRESS } from "@/lib/money";

const DAY = 86400000;
const num = (v: any) => Number(v ?? 0) || 0;
const ts = (v: any) => new Date(v).getTime();
const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const fm = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);

type Ev = { id: string; kind: "sent" | "received" | "claimed"; tip: boolean; amount: number; ts: number; status: string; who: string };

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const me = await sql`select username, display_name, wallet_address, created_at from users where id = ${userId}`;
  if (!me[0]) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const wallet = ((me[0].wallet_address as string) || "").toLowerCase();

  let balance = 0;
  if (wallet) {
    try { balance = num(formatUnits(await getTokenBalance(OUSD_ADDRESS, wallet), 6, 6)); } catch {}
  }

  const totalUsers = num((await sql`select count(*)::int as n from users`)[0].n);
  const userTs: number[] = (await sql`select created_at from users where created_at > now() - interval '9 days'`).map((u: any) => ts(u.created_at));

  const w = wallet || "none";
  const rows: any[] = await sql`
    select p.id, p.amount, p.memo, p.status, p.created_at, p.sender_id, p.recipient_address, p.recipient_email, p.recipient_x,
           p.claim_status, p.claim_amount, p.claimed_at, p.claimed_by,
           su.username as sender_username, ru.username as recipient_username
    from payments p
    join users su on su.id = p.sender_id
    left join users ru on lower(ru.wallet_address) = p.recipient_address
    where p.sender_id = ${userId} or p.recipient_address = ${w} or p.claimed_by = ${userId}
    order by p.created_at desc
    limit 500`;

  const evs: Ev[] = [];
  for (const r of rows) {
    const tip = String(r.memo || "").startsWith("Tip");
    const toLabel = r.recipient_username ? `@${r.recipient_username}` : r.recipient_x ? `@${r.recipient_x}` : r.recipient_email || short(r.recipient_address);
    if (r.sender_id === userId) {
      evs.push({ id: r.id, kind: "sent", tip, amount: num(r.amount), ts: ts(r.created_at), status: r.status, who: toLabel });
    } else if (r.recipient_address === wallet) {
      evs.push({ id: r.id, kind: "received", tip, amount: num(r.amount), ts: ts(r.created_at), status: r.status, who: `@${r.sender_username}` });
    }
    if (r.claimed_by === userId && r.claim_status === "CLAIMED") {
      evs.push({ id: r.id, kind: "claimed", tip, amount: num(r.claim_amount), ts: ts(r.claimed_at), status: "CONFIRMED", who: `@${r.sender_username}` });
    }
  }
  evs.sort((a, b) => b.ts - a.ts);
  const conf = evs.filter((e) => e.status === "CONFIRMED");
  const incoming = (e: Ev) => e.kind === "received" || e.kind === "claimed";
  const flows = conf.map((e) => ({ ts: e.ts, v: e.kind === "sent" ? -e.amount : e.amount }));

  const now = Date.now();
  const startToday = new Date();
  startToday.setUTCHours(0, 0, 0, 0);
  const t0 = startToday.getTime();

  const series: { label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const start = t0 - i * DAY;
    const end = i === 0 ? Infinity : start + DAY;
    const after = flows.filter((f) => f.ts >= end).reduce((a, f) => a + f.v, 0);
    series.push({
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      value: Math.max(0, Math.round((balance - after) * 10000) / 10000),
    });
  }

  const days8 = [7, 6, 5, 4, 3, 2, 1, 0].map((i) => ({ start: t0 - i * DAY, end: i === 0 ? Infinity : t0 - i * DAY + DAY }));
  const sum = (a: Ev[]) => a.reduce((x, e) => x + e.amount, 0);
  const tipsIn = conf.filter((e) => incoming(e) && e.tip);
  const inWin = (e: Ev, a: number, b: number) => e.ts >= now - a * DAY && e.ts < now - b * DAY;

  const newUsers7 = userTs.filter((t) => t >= now - 7 * DAY).length;
  const stats = {
    users: { value: totalUsers, change: pct(totalUsers, totalUsers - newUsers7) },
    balance: { value: balance, change: pct(balance, series[22].value) },
    tips: { value: sum(tipsIn), change: pct(sum(tipsIn.filter((e) => inWin(e, 7, -1))), sum(tipsIn.filter((e) => inWin(e, 14, 7)))) },
    tx: { value: conf.length, change: pct(conf.filter((e) => inWin(e, 7, -1)).length, conf.filter((e) => inWin(e, 14, 7)).length) },
  };
  const spark = {
    users: days8.map((d) => totalUsers - userTs.filter((t) => t >= d.end).length),
    balance: series.slice(-8).map((s) => s.value),
    tips: days8.map((d) => sum(tipsIn.filter((e) => e.ts < d.end))),
    tx: days8.map((d) => conf.filter((e) => e.ts >= d.start && e.ts < d.end).length),
  };

  const title = (e: Ev) => (e.kind === "claimed" ? "Tip claimed" : e.kind === "received" ? (e.tip ? "Tip received" : "Payment received") : e.tip ? "Tip sent" : "Payment sent");
  const tone = (e: Ev) => (e.kind === "claimed" || (e.kind === "received" && e.tip) ? "green" : e.kind === "received" ? "lav" : e.tip ? "blue" : "red");
  const icon = (e: Ev) => (e.tip || e.kind === "claimed" ? "send" : e.kind === "received" ? "download" : "upload");

  const events: any[] = evs.slice(0, 5).map((e) => ({
    id: `${e.id}-${e.kind}`,
    title: title(e),
    amt: e.kind === "sent" ? null : `+$${fm(e.amount)}`,
    text: e.kind === "sent" ? `$${fm(e.amount)} to ${e.who}` : e.kind === "claimed" ? "claimed via X" : `from ${e.who}`,
    ts: e.ts,
    tone: tone(e),
    icon: icon(e),
  }));
  events.push({ id: "wallet", title: "Wallet created", amt: null, text: `@${me[0].username}`, ts: ts(me[0].created_at), tone: "blue", icon: "wallet" });
  events.sort((a, b) => b.ts - a.ts);

  const txs = evs.slice(0, 5).map((e) => ({
    id: `${e.id}-${e.kind}`,
    type: title(e),
    who: e.who,
    amount: e.kind === "sent" ? -e.amount : e.amount,
    status: e.status === "CONFIRMED" ? "Completed" : e.status === "SUBMITTED" ? "Pending" : e.status === "FAILED" ? "Failed" : "Review",
    ts: e.ts,
    tone: tone(e),
    icon: icon(e),
  }));

  const badge = evs.filter((e) => incoming(e) && e.ts > now - DAY).length;

  return NextResponse.json({
    profile: { username: me[0].username, displayName: me[0].display_name, wallet },
    explorerUrl: wallet ? `${TEMPO.explorer}/address/${wallet}` : TEMPO.explorer,
    badge,
    stats,
    spark,
    series,
    events: events.slice(0, 5),
    txs,
  });
}
