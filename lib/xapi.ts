// Official X API v2 (app-only Bearer Token). Server-side only.
export type XUser = { id: string; username: string; name: string; avatar: string; verified: boolean };

const BASE = "https://api.x.com/2";
const FIELDS = "profile_image_url,verified,protected";
const cache = new Map<string, { at: number; ttl: number; value: any }>();

export const xConfigured = () => !!process.env.X_BEARER_TOKEN;

function getCache<T>(k: string): T | undefined {
  const h = cache.get(k);
  if (h && Date.now() - h.at < h.ttl) return h.value as T;
  return undefined;
}
function setCache(k: string, value: any, ttl: number) {
  if (cache.size > 500) cache.clear();
  cache.set(k, { at: Date.now(), ttl, value });
}

function norm(u: any): XUser | null {
  if (!u?.id || !u?.username) return null;
  return {
    id: String(u.id),
    username: String(u.username),
    name: String(u.name || u.username),
    avatar: String(u.profile_image_url || "").replace("_normal", "_400x400"),
    verified: !!u.verified,
  };
}

function explain(status: number): string {
  if (status === 0) return "X search isn't set up yet.";
  if (status === 401) return "The X API key is invalid.";
  if (status === 402 || status === 403) return "The X API plan doesn't allow this lookup.";
  if (status === 429) return "X is busy right now. Please try again in a moment.";
  return "X isn't responding right now. Please try again.";
}

async function xget(path: string): Promise<{ ok: boolean; status: number; json: any }> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return { ok: false, status: 0, json: null };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(BASE + path, { headers: { authorization: `Bearer ${token}` }, signal: ctrl.signal, cache: "no-store" });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: -1, json: null };
  } finally {
    clearTimeout(timer);
  }
}

export async function xByUsername(username: string): Promise<{ user: XUser | null; error?: string }> {
  const u = username.replace(/^@/, "").trim();
  if (!/^[A-Za-z0-9_]{1,15}$/.test(u)) return { user: null, error: "That isn't a valid X username." };
  const key = `u:${u.toLowerCase()}`;
  const hit = getCache<XUser | null>(key);
  if (hit !== undefined) return { user: hit };
  const r = await xget(`/users/by/username/${u}?user.fields=${FIELDS}`);
  if (r.status === 0) return { user: null, error: explain(0) };
  if (r.ok && r.json?.data) {
    const x = norm(r.json.data);
    setCache(key, x, 10 * 60000);
    if (x) setCache(`i:${x.id}`, x, 10 * 60000);
    return { user: x };
  }
  if (r.status === 404 || (r.ok && r.json?.errors)) { setCache(key, null, 2 * 60000); return { user: null }; }
  return { user: null, error: explain(r.status) };
}

export async function xById(id: string): Promise<{ user: XUser | null; error?: string }> {
  if (!/^\d{1,20}$/.test(id)) return { user: null, error: "That isn't a valid X account." };
  const key = `i:${id}`;
  const hit = getCache<XUser | null>(key);
  if (hit !== undefined) return { user: hit };
  const r = await xget(`/users/${id}?user.fields=${FIELDS}`);
  if (r.status === 0) return { user: null, error: explain(0) };
  if (r.ok && r.json?.data) {
    const x = norm(r.json.data);
    setCache(key, x, 10 * 60000);
    return { user: x };
  }
  if (r.status === 404 || (r.ok && r.json?.errors)) { setCache(key, null, 2 * 60000); return { user: null }; }
  return { user: null, error: explain(r.status) };
}

export async function xSearch(q: string): Promise<{ users: XUser[]; error?: string; exactOnly?: boolean }> {
  const s = q.replace(/^@/, "").trim().slice(0, 50);
  if (s.length < 2) return { users: [] };
  const key = `s:${s.toLowerCase()}`;
  const hit = getCache<{ users: XUser[]; exactOnly?: boolean }>(key);
  if (hit) return hit;
  if (!xConfigured()) return { users: [], error: explain(0) };

  const r = await xget(`/users/search?query=${encodeURIComponent(s)}&max_results=8&user.fields=${FIELDS}`);
  if (r.ok && Array.isArray(r.json?.data)) {
    const users = r.json.data.map(norm).filter(Boolean) as XUser[];
    users.forEach((u) => setCache(`i:${u.id}`, u, 10 * 60000));
    const out = { users };
    setCache(key, out, 5 * 60000);
    return out;
  }
  if (r.status === 429) return { users: [], error: explain(429) };

  // Keyword search isn't available on every X API plan: fall back to an exact @username lookup.
  if (/^[A-Za-z0-9_]{1,15}$/.test(s)) {
    const one = await xByUsername(s);
    const out = { users: one.user ? [one.user] : [], exactOnly: true, error: one.error };
    if (!one.error) setCache(key, out, 5 * 60000);
    return out;
  }
  return { users: [], exactOnly: true, error: "Type the full @username (no spaces)." };
}
