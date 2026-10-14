"use client";

export default function XAvatar({ src, size = 40 }: { src?: string; size?: number }) {
  if (!src) return <span className="cp-av" style={{ width: size, height: size, fontSize: size * 0.42 }}>X</span>;
  return (
    <img
      className="xavatar"
      src={src}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
    />
  );
}
