import { SITE_URL } from "@/lib/site";

// Passkeys are bound to cashpayt.xyz, so they work on www.cashpayt.xyz and cashpayt.xyz
export function rpInfo(req: Request) {
  const u = new URL(req.url);
  const host = u.hostname;
  const rpID = host === "cashpayt.xyz" || host.endsWith(".cashpayt.xyz") ? "cashpayt.xyz" : host;
  const origins = new Set<string>([SITE_URL, "https://cashpayt.xyz", "https://www.cashpayt.xyz"]);
  if (host.endsWith(".vercel.app") || host === "localhost") origins.add(u.origin);
  return { rpID, origins: Array.from(origins) };
}

export const splitTransports = (t: any): any[] | undefined => (t ? String(t).split(",").filter(Boolean) : undefined);
export const fromB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));
export const toB64 = (b: Uint8Array) => Buffer.from(b).toString("base64url");
