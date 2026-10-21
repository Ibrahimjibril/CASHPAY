"use client";
import { useState } from "react";
import { useMfaEnrollment, usePrivy } from "@privy-io/react-auth";

export default function PasskeyGate({ required = false }: { required?: boolean }) {
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const { logout } = usePrivy();
  const [err, setErr] = useState("");

  async function start() {
    setErr("");
    try {
      await showMfaEnrollmentModal();
    } catch {
      setErr("We couldn't open the fingerprint setup. Your device may not support passkeys, or passkey protection isn't switched on for this app yet.");
    }
  }

  return (
    <div className={required ? "gate" : "card"} style={{ textAlign: required ? "center" : "left" }}>
      <b style={{ fontSize: required ? 20 : undefined }}>{required ? "Fingerprint protection is required" : "Set up fingerprint protection first"}</b>
      <p className="small">
        For your safety, CashPay asks for your fingerprint, face or screen lock (a passkey) before money can leave your wallet. It takes a few seconds.
      </p>
      <button type="button" className={required ? "cp-btn primary" : "btn primary"} onClick={start}>Set up fingerprint (passkey)</button>
      {err && <p className="small">{err}</p>}
      {required && <button type="button" className="cp-btn ghost" onClick={() => logout()}>Sign out</button>}
    </div>
  );
}
