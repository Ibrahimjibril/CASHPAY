"use client";
import { useRouter } from "next/navigation";

export default function BackButton({ fallback = "/dashboard" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="backbtn"
      aria-label="Back"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  );
}
