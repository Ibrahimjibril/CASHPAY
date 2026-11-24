# CashPay

**Money for the social internet.** Send money as easily as sending a message.

CashPay is a stablecoin payments app that runs on **Tempo mainnet**. You can pay a **@username**, an **email address**, an **X handle** or a **wallet address**. The person you pay does not need a wallet or any crypto knowledge: they sign in, a wallet is created for them, and the money is theirs. If nobody claims a payment within 15 days, it returns to the sender.

- Live app: https://www.cashpayt.xyz
- X: [@CashPay_](https://x.com/CashPay_)
- Security policy: [SECURITY.md](SECURITY.md)

**Status:** live on Tempo mainnet and used with real funds. The code has not been independently audited. Until a review is completed, we recommend starting with small amounts.

## The problem

Paying someone online still means asking for bank details or a long wallet address, and if the other person has never used crypto, you cannot pay them at all. CashPay lets you pay an identity people already have (a username, an email, an X handle) and handles wallet creation, claiming and refunds for you.

## Features

- **Sign in** with Google, email or X. An embedded wallet is created through Privy. CashPay does not store users' private keys.
- **Send money** to a @username, email, X handle or wallet address, with an optional message and a Max button.
- **Stablecoins:** USDT, USDC, OUSD and pathUSD (TIP-20, 6 decimals). The sender chooses which one to use.
- **Pay people who are not on CashPay yet.** The payment goes to a one-time escrow wallet. The recipient opens a claim link, signs in with the email or X account the payment was sent to, and the money is sent to their new wallet. If it is not claimed within 15 days, it can be returned to the sender.
- **X accounts linked to CashPay** receive tips for their handle directly in their wallet, with no claim step.
- **Bulk Send:** up to 20 recipients (wallets, emails, X handles, usernames) in one Tempo transaction with one signature and one network fee, with a note for each recipient. Each recipient is validated before sending.
- **Tips** for CashPay users and X handles, with a shareable card.
- **Wallet page** with balances per stablecoin, your receive address and history, including deposits sent from other wallets.
- **Transactions and receipts**, notifications, profile with photo and linked accounts, and six languages (English, Chinese, French, Arabic, Hindi, Hausa).
- **Optional fingerprint lock (passkey):** asks for the fingerprint, face or screen lock when the app is opened and before payments.

## Tempo mainnet

- Chain: Tempo mainnet, chain id 4217. Default RPC: https://rpc.tempo.xyz. Explorer: https://explore.mainnet.tempo.xyz.
- Payments are Tempo transactions (type 118) whose network fee is paid in the stablecoin being sent, so users do not need a separate gas token.
- Bulk Send uses several token transfers batched into one Tempo transaction.
- Token configuration is kept in `lib/tokens.ts`. Amounts use 6 decimals.

## How it works

    Registered user, or an X account linked to a CashPay wallet
        -> the sender signs one transfer -> the funds go straight to that wallet

    Email or X handle that is not on CashPay
        -> the funds go to a one-time escrow wallet (a Privy server wallet)
        -> the recipient signs in (email, Google or X) and the server checks the identity
        -> the escrow sends the funds to the recipient's new wallet

    Not claimed within 15 days
        -> the escrow returns the funds to the sender (daily cron, or the sender's
           "Return money to my wallet" button)

## Transaction verification

The browser is never trusted to say a payment succeeded. After a payment is sent, the server reads the transaction receipt from the Tempo RPC and checks the token Transfer logs (token contract, sender, recipient and amount). Only then is the payment marked `CONFIRMED`. Statuses are `SUBMITTED`, `CONFIRMED`, `FAILED` and `MISMATCH`. Payments are unique by (transaction hash, leg), so the same transaction cannot be recorded twice. Claims and refunds are verified from their receipts in the same way before they are marked as done.

## Security

**Implemented**
- Every API route verifies the Privy access token on the server.
- Inputs are validated with Zod and database queries are parameterized.
- Atomic database locks (`CLAIMING`, `REFUNDING`) prevent double claims and double refunds.
- Claims require an identity verified by Privy (X account or email) that matches the recipient. Expired payments cannot be claimed.
- Each unclaimed payment has its own escrow wallet. Refunds go only to the sender's wallet, after expiry. The daily refund cron is protected by `CRON_SECRET`.
- Secrets are kept in environment variables.
- Email content is escaped, and profile photos are re-encoded to JPEG and validated on the server.
- Optional fingerprint lock using WebAuthn, verified on the server.

**Not independently audited.** See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Verification status

**Tested manually on Tempo mainnet by the author, with small real amounts**
- Sending payments and Bulk Send.
- Unclaimed payments held in escrow and returned to the sender after expiry.
- Deposits from other wallets showing in the wallet history.

**Implemented, not independently audited**
- Claim authorization for email and X payments, escrow handling, and the fingerprint lock.

**Planned**
- Automated test suite and continuous integration.
- Reconciliation job for interrupted sessions (see limitations).
- Wallet policies for the escrow wallets, and evaluation of an on-chain claim escrow contract.
- External security review.
- Fiat on/off-ramp partners, and sharing payments through chat apps.

## Trust model and known limitations

- **Escrow is controlled by the server.** Unclaimed payments sit in Privy server wallets controlled with `PRIVY_APP_SECRET`, so the secret must be protected. Exposure is limited in time by the 15 day expiry. An on-chain escrow is being evaluated.
- **No external audit yet**, and no automated test suite yet.
- **Recording:** a payment is recorded right after it is broadcast. If a session is interrupted in between, the transfer can exist on-chain without a record. A reconciliation job is planned.
- **Rate limiting** is minimal (new escrows are capped per user per day).
- The **fingerprint confirmation** is enforced by the app, not by the wallet.
- Emails sent through Gmail SMTP can land in spam. Resend with a custom domain is supported and recommended.
- Email payments sent before escrow was introduced were delivered to pre-generated wallets and have no expiry.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- Privy v3 (embedded wallets, login, server wallets through `@privy-io/node`)
- Tempo mainnet (chain id 4217) and viem
- Neon (serverless PostgreSQL)
- Nodemailer (Gmail SMTP) or Resend for emails
- Vercel (hosting and cron)

## Run it yourself

1. Create a Privy app (enable Google, Email, X and Wallet logins, and add your domain to the allowed origins).
2. Create a Neon database and run the SQL below.
3. Set the environment variables and deploy to Vercel (the daily refund cron is in `vercel.json`), or run `npm install && npm run dev`.

### Environment variables

    NEXT_PUBLIC_PRIVY_APP_ID       Privy app id (public)
    PRIVY_APP_SECRET               Privy app secret (secret)
    DATABASE_URL                   Neon connection string (secret)
    CRON_SECRET                    random string that protects the refund cron (secret)
    GMAIL_USER                     Gmail address used to send emails
    GMAIL_APP_PASSWORD             Gmail app password (secret)
    RESEND_API_KEY                 optional, own-domain email (secret)
    EMAIL_FROM                     optional, sender used with Resend
    APP_URL                        optional, base URL used in emails
    CLAIM_FEE_RESERVE              optional, network fee reserve kept on claims and refunds (default 0.02)
    NEXT_PUBLIC_CLAIM_DAYS         optional, days shown in the app (default 15, keep in sync with the SQL trigger)
    NEXT_PUBLIC_SITE_URL           optional, default https://www.cashpayt.xyz
    NEXT_PUBLIC_REQUIRE_PASSKEY    optional, makes the fingerprint lock mandatory
    NEXT_PUBLIC_LOCK_AFTER_SECONDS optional, seconds in the background before the app locks (default 15)

### Database schema

    create table users (
      id text primary key,
      email text,
      username text not null unique,
      display_name text not null,
      avatar_url text,
      bio text,
      wallet_address text,
      status text not null default 'active',
      x_id text,
      x_username text,
      notifications_read_at timestamptz,
      created_at timestamptz not null default now()
    );
    create unique index users_username_lower on users (lower(username));
    create unique index users_x_id_unique on users (x_id) where x_id is not null;

    create table escrows (
      id uuid primary key default gen_random_uuid(),
      created_by text not null references users(id),
      handle text not null,
      wallet_id text not null,
      address text not null,
      email text,
      x_id text,
      x_name text,
      x_avatar text,
      created_at timestamptz not null default now()
    );

    create table payments (
      id uuid primary key default gen_random_uuid(),
      sender_id text not null references users(id),
      recipient_user_id text references users(id),
      recipient_address text not null,
      recipient_email text,
      recipient_x text,
      escrow_id uuid references escrows(id),
      token text not null,
      amount numeric(20,6) not null,
      memo text,
      status text not null default 'SUBMITTED',
      tx_hash text not null,
      leg int not null default 0,
      emailed boolean not null default false,
      note text,
      claim_status text,
      claim_tx text,
      claim_amount numeric(20,6),
      claimed_by text,
      claimed_at timestamptz,
      expires_at timestamptz,
      refund_tx text,
      refund_amount numeric(20,6),
      refunded_at timestamptz,
      created_at timestamptz not null default now(),
      confirmed_at timestamptz
    );
    create unique index payments_tx_leg on payments (tx_hash, leg);
    create index payments_sender on payments (sender_id, created_at desc);
    create index payments_recipient on payments (recipient_user_id, created_at desc);

    create or replace function cashpay_set_expiry() returns trigger as $$
    begin
      if new.escrow_id is not null and new.expires_at is null then
        new.expires_at := now() + interval '15 days';
      end if;
      return new;
    end;
    $$ language plpgsql;
    create trigger cashpay_set_expiry before insert on payments
      for each row execute function cashpay_set_expiry();

    create table passkeys (
      id text primary key,
      user_id text not null references users(id),
      public_key text not null,
      counter bigint not null default 0,
      transports text,
      label text,
      created_at timestamptz not null default now(),
      last_used_at timestamptz
    );
    create table passkey_challenges (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      challenge text not null,
      purpose text not null,
      created_at timestamptz not null default now()
    );

## Project structure

    app/
      page.tsx                      landing page
      login/                        sign in
      dashboard/ wallet/ profile/ activity/ settings/   signed-in pages
      send/ send/bulk/ tips/        sending money
      claim/[id]/ batch/[hash]/     claim links and batch share pages
      u/[username]/                 public profile
      api/                          server routes (payments, claim, refund, cron, notifications, passkey, ...)
    lib/                            db, auth, tokens, Tempo helpers, escrow, refund, email, i18n
