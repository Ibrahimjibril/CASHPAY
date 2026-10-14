"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import AppShell from "../components/AppShell";
import Loader from "../components/Loader";
import Avatar from "../components/Avatar";
import { shortAddr } from "@/lib/ui";

type Profile = { username: string; display_name: string; bio: string | null; wallet_address: string | null };

// Crops the picture to a centered square, shrinks it and converts it to JPEG.
async function toJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("We couldn't read that photo."));
      i.src = url;
    });
    const S = 256;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d")!;
    const m = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, S, S);
    ctx.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, S, S);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ProfilePage() {
  const privy: any = usePrivy();
  const { ready, authenticated, getAccessToken } = privy;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [p, setP] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [v, setV] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [xl, setXl] = useState("");
  const [xmsg, setXmsg] = useState("");

  async function syncX() {
    try {
      const r = await api("/api/profile/sync-x", { method: "POST" });
      const d = await r.json();
      if (r.ok) { setXl(d.x?.username || ""); setXmsg(""); }
      else setXmsg(d.error || "We couldn't link your X account.");
    } catch { setXmsg("We couldn't link your X account."); }
  }

  useEffect(() => {
    if (!ready || !authenticated) return;
    api("/api/profile/sync-x").then((r) => r.json()).then((d) => {
      if (d.x?.username) setXl(d.x.username);
      else if (privy.user?.twitter) syncX();
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  async function linkX() {
    setXmsg("");
    try { await privy.linkTwitter?.(); } catch {}
    await syncX();
  }

  async function api(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(path, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}` } });
  }

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    api("/api/profile").then((r) => r.json()).then((d) => {
      if (!d.profile) { router.replace("/dashboard"); return; }
      setP(d.profile);
      setName(d.profile.display_name);
      setBio(d.profile.bio || "");
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { setMsg("Please choose an image."); return; }
    setBusy(true);
    setMsg("");
    try {
      const image = await toJpeg(f);
      const r = await api("/api/profile/avatar", { method: "POST", body: JSON.stringify({ image }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "We couldn't update your photo.");
      setV(Date.now());
      setMsg("✓ Photo updated.");
    } catch (err: any) {
      setMsg(err?.message || "We couldn't update your photo. Please try again.");
    }
    setBusy(false);
  }

  async function removePhoto() {
    setBusy(true);
    setMsg("");
    try {
      await api("/api/profile/avatar", { method: "DELETE" });
      setV(Date.now());
      setMsg("Photo removed.");
    } catch { setMsg("Something went wrong. Please try again."); }
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const r = await api("/api/profile/update", { method: "POST", body: JSON.stringify({ displayName: name, bio }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong.");
      setP(d.profile);
      setMsg("✓ Saved.");
    } catch (err: any) { setMsg(err?.message || "Something went wrong. Please try again."); }
    setBusy(false);
  }

  if (!ready || !authenticated || !p) return <Loader />;

  return (
    <AppShell>
      <div className="cp-welcome">
        <div>
          <h1>Your <span>Profile</span></h1>
          <p>This is how people see you on CashPay.</p>
        </div>
      </div>

      <div className="cp-panel" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Avatar key={v} username={p.username} name={p.display_name} size={104} v={v} />
        </div>
        <h2 style={{ margin: "12px 0 2px" }}>{p.display_name}</h2>
        <div className="cp-muted">@{p.username}{p.wallet_address ? ` · ${shortAddr(p.wallet_address)}` : ""}</div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
          <button className="cp-btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Please wait…" : "Change photo"}</button>
          <button className="cp-btn ghost" disabled={busy} onClick={removePhoto}>Remove photo</button>
        </div>
      </div>

      <div className="cp-panel" style={{ marginTop: 14 }}>
        <div className="cp-ph"><h2>Details</h2></div>
        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>
            Display name
            <input style={{ minHeight: 46, padding: "0 14px" }} value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          </label>
          <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>
            Bio
            <input style={{ minHeight: 46, padding: "0 14px" }} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder="Tell people about yourself" />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="cp-btn primary" disabled={busy || !name.trim()} onClick={save}>Save</button>
            <Link className="cp-btn" href={`/u/${p.username}`}>View public profile</Link>
          </div>
          {msg && <p className="cp-muted" style={{ margin: 0, fontSize: 13 }}>{msg}</p>}
        </div>
      </div>
      <div className="cp-panel" style={{ marginTop: 14 }}>
        <div className="cp-ph"><h2>Linked X account</h2></div>
        {xl ? (
          <p style={{ margin: 0 }}>✓ Linked to <b>@{xl}</b>. Tips sent to your @handle now go straight into your CashPay wallet.</p>
        ) : (
          <>
            <p className="cp-muted" style={{ marginTop: 0 }}>Link your X account so tips sent to your @handle go straight into your CashPay wallet.</p>
            <button className="cp-btn primary" onClick={linkX}>Link X account</button>
          </>
        )}
        {xmsg && <p className="cp-muted" style={{ fontSize: 13 }}>{xmsg}</p>}
      </div>
    </AppShell>
  );
}
