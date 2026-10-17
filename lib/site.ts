export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cashpayt.xyz";
// Used only for "Share on X" links.
export const toSite = (u: string) => u.replace(/^https?:\/\/[^/]+/, SITE_URL);

export const CLAIM_DAYS = Number(process.env.NEXT_PUBLIC_CLAIM_DAYS || 30);
