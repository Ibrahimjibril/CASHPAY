"use client";
import Link from "next/link";
import Icon from "./Icons";
import TokenIcon from "./TokenIcon";
import { TOKENS } from "@/lib/tokens";

export default function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="cp-modal-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label="About CashPay">
      <div className="cp-modal wide cp-about" onClick={(e) => e.stopPropagation()}>
        <div className="ab-head">
          <img src="/logo.svg" alt="" width={44} height={44} style={{ borderRadius: 12 }} />
          <div className="ab-title"><b>CashPay</b><span>Money for the social internet</span></div>
          <button className="cp-iconbtn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>

        <p className="ab-lead">Send money. Just like sending a message.</p>

        <h4>What is CashPay?</h4>
        <p>
          CashPay lets you send stablecoins to anyone using a <b>@username</b>, an <b>email</b>, an <b>X handle</b> or a{" "}
          <b>wallet address</b>. The person you pay doesn&apos;t need a wallet or any crypto knowledge: they get a claim link,
          sign in, and the money is theirs.
        </p>

        <h4>The problem we solve</h4>
        <ul>
          <li>Sending money online still means asking for bank details or long wallet addresses.</li>
          <li>If the other person has no crypto wallet, you can&apos;t pay them.</li>
          <li>Most blockchains need a separate gas token just to move a dollar.</li>
          <li>Paying many people means repeating the same transfer again and again.</li>
        </ul>

        <h4>How it works</h4>
        <div className="ab-steps">
          <div className="ab-step"><span className="ab-num g">1</span><p><b>Send.</b> Pick who to pay, the amount and the stablecoin.</p></div>
          <div className="ab-step"><span className="ab-num b">2</span><p><b>They get notified.</b> An email or an X post with a secure claim link.</p></div>
          <div className="ab-step"><span className="ab-num o">3</span><p><b>They claim.</b> They sign in with email or X and a wallet is created for them automatically.</p></div>
        </div>

        <h4>Why Tempo</h4>
        <p>Tempo is a blockchain built for payments, which is exactly what makes CashPay possible:</p>
        <ul>
          <li><b>Fees in stablecoins:</b> no gas token to buy.</li>
          <li><b>Batch payments:</b> Bulk Send pays up to 20 people in one transaction with one fee.</li>
          <li><b>Fast finality:</b> payments confirm in about a second.</li>
          <li><b>Stablecoin native (TIP-20):</b> one standard for dollar tokens.</li>
        </ul>
        <div className="ab-tokens">
          {TOKENS.map((t) => (
            <span key={t.symbol} className="ab-token"><TokenIcon symbol={t.symbol} size={20} />{t.symbol}</span>
          ))}
        </div>

        <p className="ab-note">CashPay is in alpha on Tempo mainnet. Please use small amounts while testing.</p>

        <div className="ab-cta">
          <Link className="cp-btn primary" href="/send" onClick={onClose}>Send money</Link>
          <Link className="cp-btn" href="/tips" onClick={onClose}>Tip someone</Link>
          <a className="cp-btn ghost" href="https://x.com/CashPay_" target="_blank" rel="noreferrer">Follow @CashPay_ on X</a>
        </div>
      </div>
    </div>
  );
}
