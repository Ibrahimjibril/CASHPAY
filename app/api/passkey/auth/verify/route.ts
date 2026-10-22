import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { sql } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { fromB64, rpInfo, splitTransports } from "@/lib/webauthn";

export async function POST(req: Request) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body: any = await req.json().catch(() => null);
  const response = body?.response;
  if (!response || typeof response?.id !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const ch = await sql`
    select id, challenge from passkey_challenges
    where user_id = ${userId} and purpose = 'auth' and created_at > now() - interval '5 minutes'
    order by created_at desc limit 1`;
  if (!ch[0]) return NextResponse.json({ error: "The check expired. Please try again." }, { status: 400 });
  await sql`delete from passkey_challenges where id = ${ch[0].id}`; // one-time challenge

  const cred = await sql`select id, public_key, counter, transports from passkeys where id = ${response.id} and user_id = ${userId}`;
  if (!cred[0]) return NextResponse.json({ error: "Unknown fingerprint." }, { status: 400 });

  const { rpID, origins } = rpInfo(req);
  try {
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch[0].challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      credential: {
        id: cred[0].id,
        publicKey: fromB64(cred[0].public_key) as any,
        counter: Number(cred[0].counter),
        transports: splitTransports(cred[0].transports),
      },
      requireUserVerification: true,
    });
    if (!v.verified) return NextResponse.json({ error: "Fingerprint not verified." }, { status: 401 });
    await sql`update passkeys set counter = ${v.authenticationInfo.newCounter}, last_used_at = now() where id = ${cred[0].id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("passkey verify failed", e);
    return NextResponse.json({ error: "Fingerprint not verified." }, { status: 401 });
  }
}
