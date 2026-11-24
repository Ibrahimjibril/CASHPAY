import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import { normalize, validUsername } from "@/lib/username";
import Avatar from "@/app/components/Avatar";
import BackButton from "@/app/components/BackButton";

export const dynamic = "force-dynamic";

async function load(username: string) {
  const u = normalize(decodeURIComponent(username));
  if (!validUsername(u)) return null;
  const rows = await sql`select username, display_name, bio from users where lower(username) = ${u} and status = 'active'`;
  return (rows[0] as any) || null;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const p = await load(username);
  if (!p) return { title: "CashPay" };
  return {
    title: `${p.display_name} (@${p.username}) on CashPay`,
    description: `Send money or a tip to @${p.username} on CashPay.`,
  };
}

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const p = await load(username);
  if (!p) notFound();
  const sendHref = `/send?u=${encodeURIComponent(p.username)}`;
  const tipHref = `/send?u=${encodeURIComponent(p.username)}&amount=5&memo=${encodeURIComponent("Tip 💸")}`;
  return (
    <main className="wrap center">
      <BackButton fallback="/" />
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <div style={{ marginTop: 20 }}><Avatar username={p.username} name={p.display_name} size={96} /></div>
      <h1 className="h-sm" style={{ marginBottom: 0 }}>{p.display_name}</h1>
      <p className="small" style={{ marginTop: 0 }}>@{p.username}</p>
      {p.bio && <p className="lead">{p.bio}</p>}
      <div className="cta">
        <a className="btn primary" href={sendHref}>Send money</a>
        <a className="btn" href={tipHref}>Tip</a>
      </div>
    </main>
  );
}
