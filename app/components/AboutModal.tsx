"use client";
import Link from "next/link";
import Icon from "./Icons";
import TokenIcon from "./TokenIcon";
import { TOKENS } from "@/lib/tokens";
import { useI18n } from "@/lib/i18n";

export default function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="cp-modal-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label="About CashPay">
      <div className="cp-modal wide cp-about" onClick={(e) => e.stopPropagation()}>
        <div className="ab-head">
          <img src="/logo.svg" alt="" width={44} height={44} style={{ borderRadius: 12 }} />
          <div className="ab-title"><b>CashPay</b><span>{t("abTag")}</span></div>
          <button className="cp-iconbtn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>

        <p className="ab-lead">{t("abLead")}</p>

        <h4>{t("abWhatH")}</h4>
        <p>{t("abWhat")}</p>

        <h4>{t("abProbH")}</h4>
        <ul>
          <li>{t("abP1")}</li>
          <li>{t("abP2")}</li>
          <li>{t("abP3")}</li>
          <li>{t("abP4")}</li>
        </ul>

        <h4>{t("abHowH")}</h4>
        <div className="ab-steps">
          <div className="ab-step"><span className="ab-num g">1</span><p><b>{t("abS1T")}</b> {t("abS1")}</p></div>
          <div className="ab-step"><span className="ab-num b">2</span><p><b>{t("abS2T")}</b> {t("abS2")}</p></div>
          <div className="ab-step"><span className="ab-num o">3</span><p><b>{t("abS3T")}</b> {t("abS3")}</p></div>
        </div>

        <h4>{t("abWhyH")}</h4>
        <p>{t("abWhyI")}</p>
        <ul>
          <li><b>{t("abW1T")}</b> {t("abW1")}</li>
          <li><b>{t("abW2T")}</b> {t("abW2")}</li>
          <li><b>{t("abW3T")}</b> {t("abW3")}</li>
          <li><b>{t("abW4T")}</b> {t("abW4")}</li>
        </ul>
        <div className="ab-tokens">
          {TOKENS.map((k) => (
            <span key={k.symbol} className="ab-token"><TokenIcon symbol={k.symbol} size={20} />{k.symbol}</span>
          ))}
        </div>

        <p className="ab-note">{t("abNote")}</p>

        <div className="ab-cta">
          <Link className="cp-btn primary" href="/send" onClick={onClose}>{t("qSend")}</Link>
          <Link className="cp-btn" href="/tips" onClick={onClose}>{t("qTip")}</Link>
          <a className="cp-btn ghost" href="https://x.com/CashPay_" target="_blank" rel="noreferrer">{t("abFollow")}</a>
        </div>
      </div>
    </div>
  );
}
