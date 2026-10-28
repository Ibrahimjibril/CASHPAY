"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { startAuthentication, startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";
import { REQUIRE_PASSKEY, ALLOW_SKIP_PASSKEY, LOCK_AFTER_MS } from "@/lib/passkey";

type Status = "unknown" | "none" | "enrolled";
type Support = "unknown" | "yes" | "no";
type Ctx = {
  status: Status;
  confirmTx: () => Promise<boolean>;
  enroll: () => Promise<string | null>;
  remove: () => Promise<string | null>;
};
const C = createContext<Ctx>({ status: "unknown", confirmTx: async () => true, enroll: async () => null, remove: async () => null });
export const usePasskey = () => useContext(C);

const isPublic = (p: string) => p === "/" || p.startsWith("/login") || p.startsWith("/u/") || p.startsWith("/batch/");

function friendly(e: any): string {
  const n = String(e?.name || "");
  const m = String(e?.message || "");
  if (n === "NotAllowedError" || /cancel|timed out|not allowed/i.test(m)) {
    return "Fingerprint was cancelled or timed out. If you didn't cancel it, your browser may not support passkeys: please open CashPay in Chrome, Samsung Internet or Safari, and make sure your phone has a screen lock.";
  }
  if (n === "InvalidStateError") return "This device already has a CashPay fingerprint.";
  if (n === "NotSupportedError" || /not supported/i.test(m)) {
    return "This browser or device doesn't support passkeys. Please open CashPay in Chrome, Samsung Internet or Safari.";
  }
  return "We couldn't verify your fingerprint. Please try again.";
}

export default function PasskeyProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, getAccessToken, logout } = usePrivy();
  const path = usePathname() || "/";
  const [status, setStatus] = useState<Status>("unknown");
  const [support, setSupport] = useState<Support>("unknown");
  const [skipped, setSkipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [locked, setLocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const statusRef = useRef<Status>("unknown");
  const skippedRef = useRef(false);
  const hiddenAt = useRef(0);
  const autoTried = useRef(false);
  const tokRef = useRef(getAccessToken);
  tokRef.current = getAccessToken;
  statusRef.current = status;
  skippedRef.current = skipped;

  const headers = useCallback(async () => {
    const token = await tokRef.current();
    return { "content-type": "application/json", authorization: `Bearer ${token}` } as Record<string, string>;
  }, []);

  // does this browser/device support passkeys at all?
  useEffect(() => {
    (async () => {
      try {
        const ok = browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
        setSupport(ok ? "yes" : "no");
      } catch {
        setSupport("no");
      }
      try { if (sessionStorage.getItem("cp-pk-skip") === "1") setSkipped(true); } catch {}
    })();
  }, []);

  // who is signed in, and do they have a fingerprint lock?
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { setStatus("unknown"); setLocked(true); autoTried.current = false; return; }
    (async () => {
      try {
        const flag = sessionStorage.getItem("cp-pk-reset");
        if (flag) {
          sessionStorage.removeItem("cp-pk-reset");
          if (Date.now() - Number(flag) < 15 * 60000) await fetch("/api/passkey/reset", { method: "POST", headers: await headers() });
        }
      } catch {}
      try {
        const r = await fetch("/api/passkey/status", { headers: await headers(), cache: "no-store" });
        const d = await r.json();
        setStatus(d.enrolled ? "enrolled" : "none");
      } catch {
        setStatus("none");
      }
    })();
  }, [ready, authenticated, headers]);

  // lock again when the app was in the background for a while
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > LOCK_AFTER_MS && statusRef.current === "enrolled") {
        autoTried.current = false;
        setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // asks for the fingerprint and has the server verify it
  async function runAuth(): Promise<boolean> {
    const h = await headers();
    const o = await fetch("/api/passkey/auth/options", { method: "POST", headers: h, body: "{}" });
    if (!o.ok) throw new Error("options");
    const optionsJSON = await o.json();
    const asr = await startAuthentication({ optionsJSON });
    const v = await fetch("/api/passkey/auth/verify", { method: "POST", headers: h, body: JSON.stringify({ response: asr }) });
    return v.ok;
  }

  async function unlock() {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      if (await runAuth()) setLocked(false);
      else setErr("We couldn't verify your fingerprint. Please try again.");
    } catch (e) {
      setErr(friendly(e));
    }
    setBusy(false);
  }

  async function confirmTx(): Promise<boolean> {
    if (statusRef.current !== "enrolled") return !REQUIRE_PASSKEY || skippedRef.current;
    try { return await runAuth(); } catch { return false; }
  }

  async function enroll(): Promise<string | null> {
    try {
      const h = await headers();
      const o = await fetch("/api/passkey/register/options", { method: "POST", headers: h, body: "{}" });
      if (!o.ok) return (await o.json().catch(() => ({}))).error || "We couldn't start the fingerprint setup.";
      const optionsJSON = await o.json();
      const reg = await startRegistration({ optionsJSON });
      const v = await fetch("/api/passkey/register/verify", { method: "POST", headers: h, body: JSON.stringify({ response: reg }) });
      if (!v.ok) return (await v.json().catch(() => ({}))).error || "We couldn't save your fingerprint.";
      setStatus("enrolled");
      setLocked(false);
      return null;
    } catch (e) {
      return friendly(e);
    }
  }

  async function remove(): Promise<string | null> {
    try {
      if (!(await runAuth())) return "Fingerprint not confirmed.";
      const r = await fetch("/api/passkey/remove", { method: "POST", headers: await headers() });
      if (!r.ok) return (await r.json().catch(() => ({}))).error || "We couldn't turn it off.";
      setStatus("none");
      return null;
    } catch (e) {
      return friendly(e);
    }
  }

  function recover() {
    try { sessionStorage.setItem("cp-pk-reset", String(Date.now())); } catch {}
    logout();
  }

  function skip() {
    try { sessionStorage.setItem("cp-pk-skip", "1"); } catch {}
    setSkipped(true);
  }

  function copyLink() {
    try {
      navigator.clipboard.writeText(window.location.origin + "/dashboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const guarded = authenticated && !isPublic(path);
  const needLock = guarded && status === "enrolled" && locked;
  const needEnroll = guarded && REQUIRE_PASSKEY && status === "none" && !skipped && !path.startsWith("/claim");
  const checking = guarded && status === "unknown";

  // try the fingerprint automatically as soon as the lock screen appears
  useEffect(() => {
    if (needLock && !autoTried.current) { autoTried.current = true; unlock(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needLock]);

  async function enrollNow() {
    setBusy(true);
    setErr("");
    const e = await enroll();
    if (e) setErr(e);
    setBusy(false);
  }

  return (
    <C.Provider value={{ status, confirmTx, enroll, remove }}>
      {children}
      {checking && (
        <div className="lock"><img src="/logo.svg" alt="CashPay" width={76} height={76} className="cp-spin" /></div>
      )}
      {needLock && (
        <div className="lock">
          <div className="box">
            <img src="/logo.svg" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
            <h1 style={{ margin: 0 }}>CashPay is locked</h1>
            <p style={{ margin: 0, opacity: 0.8 }}>Use your fingerprint, face or screen lock to open the app.</p>
            <button className="cp-btn primary" style={{ minWidth: 220, minHeight: 52 }} disabled={busy} onClick={unlock}>
              {busy ? "Waiting for your fingerprint…" : "Unlock"}
            </button>
            {err && <p style={{ margin: 0, fontSize: 14 }}>{err}</p>}
            <button className="cp-btn ghost" onClick={recover}>I can&apos;t use my fingerprint</button>
          </div>
        </div>
      )}
      {needEnroll && (
        <div className="lock">
          <div className="box">
            <img src="/logo.svg" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
            {support === "no" ? (
              <>
                <h1 style={{ margin: 0 }}>This browser can&apos;t use fingerprint lock</h1>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  CashPay protects your money with your fingerprint, face or screen lock (a passkey), but this browser or phone setting doesn&apos;t support it. Open CashPay in <b>Chrome, Samsung Internet or Safari</b>, and make sure your phone has a screen lock.
                </p>
              </>
            ) : (
              <>
                <h1 style={{ margin: 0 }}>Set up your fingerprint lock</h1>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  For your safety, CashPay asks for your fingerprint, face or screen lock every time you open the app and before every payment.
                </p>
                <button className="cp-btn primary" style={{ minWidth: 240, minHeight: 52 }} disabled={busy} onClick={enrollNow}>
                  {busy ? "Please wait…" : "Set up fingerprint"}
                </button>
              </>
            )}
            {err && <p style={{ margin: 0, fontSize: 14 }}>{err}</p>}
            <button className="cp-btn" onClick={copyLink}>{copied ? "Link copied ✓" : "Copy link to open in another browser"}</button>
            {ALLOW_SKIP_PASSKEY && (
              <button className="cp-btn ghost" onClick={skip}>Continue without fingerprint (less secure)</button>
            )}
            <button className="cp-btn ghost" onClick={() => logout()}>Sign out</button>
          </div>
        </div>
      )}
    </C.Provider>
  );
}
