import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { rpInfo, splitTransports } from "@/lib/webauthn";

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { rpID } = rpInfo(req);
  const u = await sql`select username, display_name from users where id = ${userId}`;
  if (!u[0]) return NextResponse.json({ error: "Finish setting up your profile first." }, { status: 404 });
  const existing: any[] = await sql`select id, transports from passkeys where user_id = ${userId}`;
  if (existing.length >= 5) return NextResponse.json({ error: "You already have the maximum number of fingerprints." }, { status: 400 });

  const options = await generateRegistrationOptions({
    rpName: "CashPay",
    rpID,
    userName: u[0].username,
    userDisplayName: u[0].display_name,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: splitTransports(c.transports) })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
  });
  await sql`delete from passkey_challenges where created_at < now() - interval '10 minutes'`;
  await sql`insert into passkey_challenges (user_id, challenge, purpose) values (${userId}, ${options.challenge}, 'register')`;
  return NextResponse.json(options);
}
