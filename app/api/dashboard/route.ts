import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { TEMPO, getTokenBalance, formatUnits } from "@/lib/tempo";
import { TOKENS } from "@/lib/tokens";

const DAY = 86400000;
const num = (v: any) => Number(v ?? 0) || 0;
const ts = (v: any) => new Date(v).getTime();
const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);

type Ev = { id: string; kind: "sent" | "received" | "claimed"; tip: boolean; amount: number; ts: number; status: string; who: string };

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const me = await sql`select username, display_name, wallet_address, created_at from users where id = ${userId}`;
  if (!me[0]) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const wallet = ((me[0].wallet_address as string) || "").toLowerCase();
  const w = wallet || "none";

  const [balList, rows]: any[] = await Promise.all([
    Promise.all(TOKENS.map((t) => (wallet ? getTokenBalance(t.address, wallet).catch(() => BigInt(0)) : Promise.resolve(BigInt(0))))),
    sql`
      select p.id, p.amount, p.memo, p.status, p.created_at, p.sender_id, p.recipient_address, p.recipient_email, p.recipient_x,
             p.claim_status, p.claim_amount, p.claimed_at, p.claimed_by,
             su.username as sender_username, ru.username as recipient_username
      from payments p
      join users su on su.id = p.sender_id
      left join users ru on lower(ru.wallet_address) = p.recipient_address
      where p.sender_id = ${userId} or p.recipient_address = ${w} or p.claimed_by = ${userId}
      order by p.created_at desc
      limit 300`,
  ]);

  const list = balList as bigint[];
  const balance = num(formatUnits(list.reduce((a, b) => a + b, BigInt(0)), 6, 6));
  const tokens = TOKENS.map((t, i) => ({ symbol: t.symbol, name: t.name, sub: t.sub, display: formatUnits(list[i], 6, 4) }));

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

  // People this user has paid (only the user's own payments, never the app-wide user count)
  const first = new Map<string, number>();
  for (const e of conf) {
    if (e.kind !== "sent") continue;
    const k = e.who.toLowerCase();
    const cur = first.get(k);
    if (cur === undefined || e.ts < cur) first.set(k, e.ts);
  }
  const firsts = Array.from(first.values());

  const stats = {
    people: {
      value: firsts.length,
      change: pct(firsts.filter((x) => x >= now - 7 * DAY).length, firsts.filter((x) => x >= now - 14 * DAY && x < now - 7 * DAY).length),
    },
    balance: { value: balance, change: pct(balance, series[22].value) },
    tips: { value: sum(tipsIn), change: pct(sum(tipsIn.filter((e) => inWin(e, 7, -1))), sum(tipsIn.filter((e) => inWin(e, 14, 7)))) },
    tx: { value: conf.length, change: pct(conf.filter((e) => inWin(e, 7, -1)).length, conf.filter((e) => inWin(e, 14, 7)).length) },
  };
  const spark = {
    people: days8.map((d) => firsts.filter((x) => x < d.end).length),
    balance: series.slice(-8).map((s) => s.value),
    tips: days8.map((d) => sum(tipsIn.filter((e) => e.ts < d.end))),
    tx: days8.map((d) => conf.filter((e) => e.ts >= d.start && e.ts < d.end).length),
  };

  const code = (e: Ev) => (e.kind === "claimed" ? "claimed" : e.kind === "received" ? (e.tip ? "tipRecv" : "payRecv") : e.tip ? "tipSent" : "paySent");
  const tone = (e: Ev) => (e.kind === "claimed" || (e.kind === "received" && e.tip) ? "green" : e.kind === "received" ? "lav" : e.tip ? "blue" : "red");
  const icon = (e: Ev) => (e.tip || e.kind === "claimed" ? "send" : e.kind === "received" ? "download" : "upload");

  const txs = evs.slice(0, 5).map((e) => ({
    id: `${e.id}-${e.kind}`, code: code(e), who: e.who, amount: e.kind === "sent" ? -e.amount : e.amount,
    status: e.status, ts: e.ts, tone: tone(e), icon: icon(e),
  }));

  const badge = evs.filter((e) => incoming(e) && e.ts > now - DAY).length;

  return NextResponse.json({
    profile: { username: me[0].username, displayName: me[0].display_name, wallet },
    explorerUrl: wallet ? `${TEMPO.explorer}/address/${wallet}` : TEMPO.explorer,
    badge, stats, spark, series, tokens, txs,
  });
}
