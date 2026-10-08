import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getPrivy, getUserId } from "@/lib/auth";

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(120) });

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email;

  const rows = await sql`select username, wallet_address from users where lower(email) = ${email} and wallet_address is not null limit 1`;
  if (rows[0]) return NextResponse.json({ kind: "user", username: rows[0].username, address: rows[0].wallet_address });

  const privy: any = getPrivy();
  let user: any = null;
  try { user = await privy.getUserByEmail(email); } catch { user = null; }
  if (!user) {
    try {
      user = await privy.importUser({ linkedAccounts: [{ type: "email", address: email }], createEthereumWallet: true });
    } catch {
      return NextResponse.json({ error: "We couldn't prepare this payment. Please try again." }, { status: 500 });
    }
  }
  const address: string | null = user?.wallet?.address ?? null;
  if (!address) return NextResponse.json({ error: "We couldn't prepare this payment. Please try again." }, { status: 500 });
  return NextResponse.json({ kind: "new", address });
}
