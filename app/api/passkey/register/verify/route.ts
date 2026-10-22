import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { rpInfo, toB64 } from "@/lib/webauthn";

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body: any = await req.json().catch(() => null);
  const response = body?.response;
  if (!response || typeof response !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const ch = await sql`
    select id, challenge from passkey_challenges
    where user_id = ${userId} and purpose = 'register' and created_at > now() - interval '5 minutes'
    order by created_at desc limit 1`;
  if (!ch[0]) return NextResponse.json({ error: "The setup expired. Please try again." }, { status: 400 });
  await sql`delete from passkey_challenges where id = ${ch[0].id}`;

  const { rpID, origins } = rpInfo(req);
  try {
    const v = await verifyRegistrationResponse({
      response,
      expectedChallenge: ch[0].challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!v.verified || !v.registrationInfo) return NextResponse.json({ error: "We couldn't verify your fingerprint." }, { status: 400 });
    const cred: any = (v.registrationInfo as any).credential;
    const transports = (cred.transports || response?.response?.transports || []).join(",");
    await sql`
      insert into passkeys (id, user_id, public_key, counter, transports)
      values (${cred.id}, ${userId}, ${toB64(cred.publicKey)}, ${cred.counter ?? 0}, ${transports})
      on conflict (id) do nothing`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("passkey register failed", e);
    return NextResponse.json({ error: "We couldn't verify your fingerprint." }, { status: 400 });
  }
}
