import { sql } from "@/lib/db";
import { normalize, validUsername } from "@/lib/username";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const u = normalize(decodeURIComponent(username));
  if (!validUsername(u)) return new Response("Not found", { status: 404 });
  const rows = await sql`select avatar_url from users where lower(username) = ${u} and status = 'active'`;
  const data = rows[0]?.avatar_url as string | undefined;
  const m = data ? /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(data) : null;
  if (!m) return new Response("Not found", { status: 404 });
  const buf = Buffer.from(m[1], "base64");
  return new Response(new Uint8Array(buf) as any, {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
