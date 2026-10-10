// Splits X handles into chunks so each post stays under X's 280 character limit.
export function tweetChunks(handles: string[], budget = 200): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let len = 0;
  for (const h of handles) {
    const tag = "@" + h.replace(/^@/, "");
    const add = tag.length + 1;
    if (cur.length && len + add > budget) { out.push(cur); cur = []; len = 0; }
    cur.push(tag);
    len += add;
  }
  if (cur.length) out.push(cur);
  return out;
}

export function tweetHref(tags: string[], link: string) {
  const text = `I just tipped ${tags.join(" ")} on CashPay 💸\n\nClaim it here:`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
}
