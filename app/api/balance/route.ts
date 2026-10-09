import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getPrivy, getUserId } from "@/lib/auth";
import { TEMPO, getTokenBalance, formatUnits } from "@/lib/tempo";
import { TOKENS } from "@/lib/tokens";

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

  const zero = TOKENS.map((t) => ({ symbol: t.symbol, name: t.name, sub: t.sub, address: t.address, balance: "0.000000", display: "0.00" }));
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ total: "0.00", tokens: zero, explorerUrl: null });
  }

  let failed = 0;
  const list: bigint[] = await Promise.all(
    TOKENS.map(async (t) => {
      try { return await getTokenBalance(t.address, address as string); } catch { failed++; return BigInt(0); }
    })
  );
  if (failed === TOKENS.length) {
    return NextResponse.json({ error: "Tempo is taking longer than expected. We're checking." }, { status: 502 });
  }
  const sum = list.reduce((a, b) => a + b, BigInt(0));
  return NextResponse.json({
    total: formatUnits(sum, 6, 2),
    tokens: TOKENS.map((t, i) => ({
      symbol: t.symbol, name: t.name, sub: t.sub, address: t.address,
      balance: formatUnits(list[i], 6, 6), display: formatUnits(list[i], 6, 4),
    })),
    explorerUrl: `${TEMPO.explorer}/address/${address}`,
  });
}
