// NEXT_PUBLIC_REQUIRE_PASSKEY
//   "0" (default) = fingerprint lock is optional
//   "send"        = asked once, the first time someone sends money (devices without passkey support can still send)
//   "1"           = strict: the whole app is locked until the fingerprint is set up
const MODE = process.env.NEXT_PUBLIC_REQUIRE_PASSKEY || "0";
export const REQUIRE_PASSKEY = MODE === "1";
export const REQUIRE_ON_SEND = MODE === "send";

// How long the app may stay in the background before it locks again (seconds, default 15).
export const LOCK_AFTER_MS = Number(process.env.NEXT_PUBLIC_LOCK_AFTER_SECONDS || 15) * 1000;

// Legacy (Privy MFA) check. The CashPay fingerprint lock replaced it, so it never blocks anything now.
export const hasPasskey = (_user: any): boolean => true;

// Optional: let people on devices WITHOUT passkey support continue (less secure). Off by default.
export const ALLOW_SKIP_PASSKEY = process.env.NEXT_PUBLIC_ALLOW_SKIP_PASSKEY === "1";
