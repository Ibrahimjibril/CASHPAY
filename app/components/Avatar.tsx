"use client";
import { useState } from "react";

export default function Avatar({ username, name, size = 40, v }: { username: string; name?: string; size?: number; v?: number }) {
  const [bad, setBad] = useState(false);
  const letter = String(name || username || "?").charAt(0).toUpperCase();
  if (bad) {
    return <span className="cp-av" style={{ width: size, height: size, fontSize: size * 0.42 }}>{letter}</span>;
  }
  return (
    <img
      className="cp-av"
      src={`/api/avatar/${encodeURIComponent(username)}${v ? `?v=${v}` : ""}`}
      alt=""
      width={size}
      height={size}
      onError={() => setBad(true)}
      style={{ width: size, height: size }}
    />
  );
}
