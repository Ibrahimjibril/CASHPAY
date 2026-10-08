import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getPrivy, getUserId } from "@/lib/auth";
import { TEMPO, TOKENS, getTokenBalance, formatUnits } from "@/lib/tempo";

export async function GET(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const rows = await sql`select wallet_address from users where id = ${userId}`;
  if (!rows[0]) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  let address: string | null = rows[0].wallet_address;
  if (!address) {
    const pu = await getPrivy().getUser(userId);
    address = pu.wallet?.address ?? null;
    if (address) await sql`update users set wallet_address = ${address} where id = ${userId}`;
  }
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ total: "0.00", tokens: [], explorerUrl: null });
  }

  try {
    const results = await Promise.all(
      TOKENS.map(async (t) => ({ symbol: t.symbol, decimals: t.decimals, raw: await getTokenBalance(t.address, address as string) }))
    );
    const sum = results.reduce((a, r) => a + r.raw, BigInt(0));
    return NextResponse.json({
      total: formatUnits(sum, 6, 2),
      tokens: results.map((r) => ({ symbol: r.symbol, display: formatUnits(r.raw, r.decimals, 2) })),
      explorerUrl: `${TEMPO.explorer}/address/${address}`,
    });
  } catch {
    return NextResponse.json({ error: "Tempo is taking longer than expected. We're checking." }, { status: 502 });
  }
}
