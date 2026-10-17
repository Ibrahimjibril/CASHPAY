# CashPay

**Money for the social internet.** Send money just like sending a message.

CashPay is a stablecoin payments app built on **Tempo mainnet**. Pay anyone with a **@username**, an **email address**, an **X handle** or a **wallet address**. The person you pay does not need a wallet or any crypto knowledge: they sign in and the money is theirs.

- Live app: https://www.cashpayt.xyz
- X: https://x.com/CashPay_
- Repository: https://github.com/Ibrahimjibril/CASHPAY

> Status: public alpha on Tempo mainnet with real funds. Use small amounts while testing.

## What you can do

- **Sign in** with Google, email, X or a wallet. A secure embedded wallet is created for you (Privy).
- **Send money** to a @username, email, X handle or wallet address, in **USDT, USDC, OUSD or pathUSD**, with an optional message and a **Max** button.
- **Pay people who are not on CashPay yet**
  - **Email:** they get a claim link and sign in with that email (code or Google).
  - **X handle:** they claim by signing in with X. If they linked X to their CashPay profile, the tip goes **straight into their wallet** with no claim.
- **Expiry and refunds:** unclaimed email and X payments return to the sender after **30 days**.
- **Bulk Send:** pay up to 20 people in one transaction, one signature, one network fee.
- **Tips**, **receipts** you can screenshot, share cards for X, and a shareable batch page for many tips at once.
- **Wallet page:** balances per stablecoin, your receive address, and full history **including deposits sent from other wallets**.
- **Profile:** photo, display name, bio, and a linked X account.
- **Notifications** with "Mark all as read", **6 languages** (English, Chinese, French, Arabic, Hindi, Hausa), light and dark mode, mobile first.

## How it works

    Registered user, or X account linked to a wallet
        -> the sender signs a transfer -> funds go straight to that wallet

    Email or X handle not on CashPay
        -> funds go to a one-time escrow wallet (Privy server wallet)
        -> the recipient signs in (email / Google / X). Privy verifies who they are
        -> the server checks it matches the recipient and sends the funds to their new wallet

    Nobody claims within 30 days
        -> the escrow returns the funds to the sender (daily cron, or the sender taps
           "Return money to my wallet")

Every payment is **verified on-chain by the server**. A payment is only marked `CONFIRMED` after the server reads the Tempo transaction receipt and checks the token transfer log (sender, recipient, amount and token).

## Security

**Authentication and sessions**
- Every API route verifies the Privy access token on the server. Nothing trusts the browser.
- Identities used for claims (X account, email) are read from Privy after OAuth or email verification, never from the request body.

**Keys and custody**
- Users' embedded wallets are managed by Privy. CashPay never sees private keys or seed phrases.
- Unclaimed payments sit in a one-time escrow wallet per payment (Privy server wallet, controlled by CashPay's server). Each payment has its own escrow, so payments are isolated from each other.

**Payments**
- Server-side verification from receipt logs. Statuses: `SUBMITTED`, `CONFIRMED`, `FAILED`, `MISMATCH`.
- Idempotent by transaction hash and leg number, so a payment can't be recorded twice.
- Network fees are paid in the stablecoin being sent; a small reserve (default $0.02) is kept for claim and refund transactions.

**Claims, expiry and refunds**
- Atomic database locks (`CLAIMING`, `REFUNDING`) make double claims and double refunds impossible.
- Claim and refund transactions are verified on-chain before they are marked done.
- Claims need a verified match with the recipient (X account or email). Expired links are rejected.
- Refunds go only to the sender's own wallet. The daily cron is protected by `CRON_SECRET`.

**Input, data and content**
- All inputs are validated (Zod). SQL uses parameterized queries.
- User text in emails is HTML-escaped. Profile photos are re-encoded to a small JPEG in the browser, validated on the server (type, size, JPEG signature) and served with `nosniff`.
- Secrets live only in environment variables. `.env` files are git-ignored.
- Claim pages are public to anyone who has the (unguessable) link and show the amount, sender and message.

**Known limitations**
- Escrow funds are custodial until claimed or returned. If `PRIVY_APP_SECRET` leaked, escrow funds would be at risk. Keep the secret safe and rotate it if in doubt.
- No external security audit and no automated test suite yet.
- X claims match the X username that Privy verified (the permanent X user id is used when it is known). A handle that changes hands could be claimed by the new owner; the 30 day expiry limits this.
- Rate limiting is minimal (escrow creation is capped per user per day).
- Email payments sent before escrow was introduced were delivered directly to a pre-generated wallet and have no expiry.
- Emails sent from a new Gmail account may land in spam. A custom domain with Resend is the production fix.

## What's new

- Unclaimed email and X payments **expire after 30 days and return to the sender**, with a daily cron and a manual button.
- Email payments now use escrow, and the recipient can claim with **email code or Google**.
- **Link X account** in Profile: tips to your @handle go straight to your wallet.
- **Wallet page** (balances, receive address, full history including deposits from other wallets), **Profile page** with photo, and mobile bottom navigation (Home, Wallet, Profile).
- **Notifications** with "Mark all as read". **Refresh** buttons that force fresh data.
- **Max** button in Send, Tips and Bulk Send. Bulk Send batch share page with one card for everyone tagged.
- **USDT, USDC, OUSD and pathUSD** support, six languages, About CashPay window.
- Branded claim emails with an embedded banner and an X button; new domain https://www.cashpayt.xyz.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- Privy v3 (embedded wallets, login, linking, server wallets via `@privy-io/node`)
- Tempo mainnet (chain id 4217), viem
- Neon (serverless PostgreSQL)
- Nodemailer (Gmail SMTP) or Resend for emails
- Vercel hosting and Vercel Cron

## Run it yourself

1. Create a Privy app (enable Google, Email, X and Wallet logins; add your domain to allowed origins).
2. Create a Neon database and run the SQL below.
3. Set the environment variables, deploy to Vercel (the daily refund cron is configured in `vercel.json`).

### Environment variables

    NEXT_PUBLIC_PRIVY_APP_ID    Privy app id (public)
    PRIVY_APP_SECRET            Privy app secret (secret)
    DATABASE_URL                Neon connection string (secret)
    CRON_SECRET                 random string protecting the refund cron (secret)
    GMAIL_USER                  Gmail address used to send emails
    GMAIL_APP_PASSWORD          Gmail app password (secret)
    RESEND_API_KEY              optional, own-domain email (secret)
    EMAIL_FROM                  optional, e.g. CashPay <noreply@yourdomain>
    APP_URL                     optional, base URL used in emails
    CLAIM_FEE_RESERVE           optional, fee reserve kept on claims/refunds (default 0.02)
    NEXT_PUBLIC_CLAIM_DAYS      optional, days shown in the app (default 30, keep in sync with the SQL trigger)
    NEXT_PUBLIC_SITE_URL        optional, default https://www.cashpayt.xyz (Share on X links)

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
        new.expires_at := now() + interval '30 days';
      end if;
      return new;
    end;
    $$ language plpgsql;
    create trigger cashpay_set_expiry before insert on payments
      for each row execute function cashpay_set_expiry();

## Project structure

    app/
      page.tsx                landing page
      dashboard/ wallet/ profile/ activity/ settings/   signed-in pages
      send/ send/bulk/ tips/  sending money
      claim/[id]/ batch/[hash]/   claim links and batch share pages
      u/[username]/           public profile
      api/                    server routes (payments, claim, refund, cron, notifications, ...)
    lib/                      db, auth, Tempo helpers, escrow, refund, email, i18n

## Roadmap

- Automated tests and an external security review.
- Admin control center with audit logs and reconciliation.
- Move from server escrow wallets to an on-chain claim escrow contract.
- Payment requests and richer notifications.
