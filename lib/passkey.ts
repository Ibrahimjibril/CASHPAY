// Set NEXT_PUBLIC_REQUIRE_PASSKEY=1 in Vercel to require fingerprint (passkey) protection before sending money.
export const REQUIRE_PASSKEY = process.env.NEXT_PUBLIC_REQUIRE_PASSKEY === "1";

// True when the user has enrolled a passkey as a wallet security method (Privy MFA)
export const hasPasskey = (user: any): boolean =>
  Array.isArray(user?.mfaMethods) && user.mfaMethods.includes("passkey");
