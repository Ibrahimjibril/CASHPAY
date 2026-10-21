"use client";
import { useMfaEnrollment } from "@privy-io/react-auth";

export default function PasskeyGate() {
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  return (
    <div className="card" style={{ textAlign: "left" }}>
      <b>Set up fingerprint protection first</b>
      <p className="small">
        For your safety, CashPay asks for your fingerprint, face or screen lock (a passkey) before money can leave your wallet. It takes a few seconds.
      </p>
      <button type="button" className="btn primary" onClick={() => { Promise.resolve(showMfaEnrollmentModal()).catch(() => {}); }}>
        Set up fingerprint (passkey)
      </button>
    </div>
  );
}
