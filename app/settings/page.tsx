"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import AppShell from "../components/AppShell";
import Icon from "../components/Icons";
import Loader from "../components/Loader";
import { LANGS, useI18n } from "@/lib/i18n";

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { ready, authenticated, getAccessToken, logout } = usePrivy();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) { router.replace("/login"); return; }
    (async () => {
      const token = await getAccessToken();
      const r = await fetch("/api/profile", { headers: { authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!d.profile) router.replace("/dashboard"); else setP(d.profile);
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  if (!ready || !authenticated || !p) return <Loader />;

  const addr: string = p.wallet_address || "";
  return (
    <AppShell>
      <div className="cp-welcome">
        <div>
          <h1>{t("sA")} <span>{t("sB")}</span></h1>
          <p>{t("sSub")}</p>
        </div>
      </div>

      <div className="cp-panel" style={{ marginBottom: 14 }}>
        <div className="cp-ph"><h2>{t("sLang")}</h2></div>
        <p className="cp-muted" style={{ marginTop: 0 }}>{t("sLangSub")}</p>
        <div className="cp-langs">
          {LANGS.map((l) => (
            <button key={l.code} className={`cp-lang${lang === l.code ? " on" : ""}`} onClick={() => setLang(l.code)}>
              {lang === l.code ? "✓ " : ""}{l.name}
            </button>
          ))}
        </div>
      </div>

      <div className="cp-sub" style={{ marginBottom: 14 }}>
        <div className="cp-panel">
          <div className="cp-ph"><h2>{t("sProfile")}</h2></div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="cp-ic green" style={{ width: 64, height: 64, borderRadius: "50%", fontSize: 26, fontWeight: 800 }}>{String(p.display_name).charAt(0).toUpperCase()}</span>
            <div>
              <b style={{ fontSize: 18 }}>{p.display_name}</b>
              <div className="cp-muted">@{p.username}</div>
              {p.bio && <div className="cp-muted" style={{ marginTop: 4 }}>{p.bio}</div>}
            </div>
          </div>
          <div style={{ marginTop: 16 }}><a className="cp-btn" href={`/u/${p.username}`}>{t("sViewProfile")}</a></div>
        </div>

        <div className="cp-panel">
          <div className="cp-ph"><h2>{t("sWallet")}</h2></div>
          <div className="cp-kv"><span>{t("sAddress")}</span><b style={{ fontSize: 13 }}>{addr || "—"}</b></div>
          <div className="cp-kv"><span>{t("rNet")}</span><b>Tempo Mainnet</b></div>
          <div className="cp-kv"><span>{t("rAsset")}</span><b>USDT · USDC · OUSD · pathUSD</b></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {addr && (
              <button className="cp-btn" onClick={() => { navigator.clipboard.writeText(addr); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                <Icon name={copied ? "check" : "copy"} size={16} />{copied ? t("sCopied") : t("sCopyAddr")}
              </button>
            )}
            {addr && <a className="cp-btn" href={`https://explore.mainnet.tempo.xyz/address/${addr}`} target="_blank" rel="noreferrer">{t("rExplorer")}</a>}
          </div>
        </div>
      </div>

      <div className="cp-panel">
        <div className="cp-ph"><h2>{t("sAccount")}</h2></div>
        <p className="cp-muted" style={{ marginTop: 0 }}>{t("sAccountText")}</p>
        <button className="cp-btn ghost" onClick={async () => {
          try { sessionStorage.removeItem("cp-dash"); sessionStorage.removeItem("cp-dash2"); sessionStorage.removeItem("cp-act"); } catch {}
          await logout();
          router.replace("/");
        }}><Icon name="logout" size={16} />{t("sSignOut")}</button>
      </div>
    </AppShell>
  );
}
