const RESERVED = ["admin","administrator","support","help","cashpay","root","system","tempo","api","login","send","tips","request","wallet","dashboard","claim","security","official","staff","moderator"];

export function normalize(u: string) {
  return u.trim().replace(/^@/, "").toLowerCase();
}
export function validUsername(u: string) {
  return /^[a-z0-9_]{3,20}$/.test(u) && !RESERVED.includes(u);
}
