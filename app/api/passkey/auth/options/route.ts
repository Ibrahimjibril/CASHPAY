import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { rpInfo, splitTransports } from "@/lib/webauthn";

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const rows: any[] = await sql`select id, transports from passkeys where user_id = ${userId}`;
  if (!rows.length) return NextResponse.json({ error: "No fingerprint is set up." }, { status: 404 });
  const { rpID } = rpInfo(req);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: rows.map((c) => ({ id: c.id, transports: splitTransports(c.transports) })),
  });
  await sql`delete from passkey_challenges where created_at < now() - interval '10 minutes'`;
  await sql`insert into passkey_challenges (user_id, challenge, purpose) values (${userId}, ${options.challenge}, 'auth')`;
  return NextResponse.json(options);
}
