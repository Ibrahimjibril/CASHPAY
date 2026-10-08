import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { normalize, validUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const u = normalize(decodeURIComponent(username));
  if (!validUsername(u)) notFound();
  const rows = await sql`select username, display_name, bio from users where lower(username) = ${u} and status = 'active'`;
  const p = rows[0];
  if (!p) notFound();
  return (
    <main className="wrap center">
      <a className="brand" href="/"><img src="/logo.svg" alt="" />CashPay</a>
      <div className="avatar big">{String(p.display_name).charAt(0).toUpperCase()}</div>
      <h1 className="h-sm">{p.display_name}</h1>
      <p className="small">@{p.username}</p>
      {p.bio && <p className="lead">{p.bio}</p>}
      <div className="cta"><span className="btn" aria-disabled>Send · soon</span><span className="btn" aria-disabled>Tip · soon</span></div>
    </main>
  );
}
