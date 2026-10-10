# CashPay

**Money for the social internet.** Send money just like sending a message.

CashPay is a stablecoin payments app built on **Tempo mainnet**. You can pay anyone with a **@username**, an **email address**, an **X (Twitter) handle** or a **wallet address**. The person you pay does not need a wallet, crypto knowledge or a CashPay account in advance: they get a claim link, sign in, and the money is theirs.

- Live app: https://www.cashpayt.xyz
- Repository: https://github.com/Ibrahimjibril/CASHPAY
- Built by: Ibrahimjibril

> Status: public alpha running on Tempo mainnet with real funds. Please use small amounts while testing.

## What you can do

- **Sign in** with Google, email, X or an existing wallet. A secure embedded wallet is created automatically (Privy). CashPay never sees private keys.
- **Send money** to a @username, an email, an X handle or a wallet address, with an optional message.
- **Pay people who are not on CashPay yet**
  - **Email:** the recipient gets a claim email, signs in with that email and the money is already in their wallet.
  - **X handle:** the sender gets a share card ("Share on X") that tags the handle and contains the claim link. The recipient taps "Connect X to claim" and the money is sent to their new wallet.
- **Bulk send:** pay up to 20 people (mix of usernames, emails, X handles and wallet addresses) in **one transaction with one signature and one network fee**.
- **Tips:** search a @username or any X handle and tip in two taps.
- **Transaction history** with filters, search and a shareable **receipt** for each payment (copy claim link, resend email, view on explorer).
- **Dashboard** with live balance, tips received, transaction count and a balance chart.
- **Share previews:** every claim link has a branded preview card on X and WhatsApp.
- **6 languages:** English, Chinese, French, Arabic (right-to-left), Hindi and Hausa.
- Light and dark mode, mobile first.

## Why Tempo

CashPay uses Tempo features that make payments feel normal:

- **TIP-20 stablecoin (OUSD)** is the money. Amounts are shown in dollars.
- **Tempo transactions (type 118)** let us pay the **network fee in the stablecoin itself**, so users never need a separate gas token.
- **Batched calls** in one Tempo transaction power Bulk Send.
- EVM compatible, so standard tooling (viem, JSON-RPC) works.

## How it works

    Registered user  ->  sender signs a transfer  ->  funds go straight to the recipient wallet
    Email recipient  ->  Privy pre-generates a wallet for that email -> funds go there
                         -> recipient signs in with the email (OTP) and sees the money
    X recipient      ->  funds go to a one-time escrow wallet (Privy server wallet)
                         -> recipient signs in with X -> server checks the X handle matches
                         -> escrow sends the money to the recipient's new wallet

Every payment is **verified on-chain by the server**, not trusted from the browser. The server fetches the transaction receipt and checks the token transfer log (sender, recipient and amount) before marking a payment `CONFIRMED`.

## Security design

- Server-side authentication on every API route (Privy access token verified on the server).
- Payments are verified from the Tempo receipt logs. Statuses: `SUBMITTED`, `CONFIRMED`, `FAILED`, `MISMATCH`.
- Idempotent by transaction hash (and leg number for bulk payments), so a payment cannot be recorded twice.
- X claims are protected by an **atomic claim lock**, so a claim can only be processed once. The X identity is verified by Privy OAuth, and the destination is the claimer's own embedded wallet.
- No private keys or seed phrases are stored by CashPay. Secrets live in environment variables.
- Input validation with Zod; users get friendly errors instead of raw blockchain errors.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- Privy v3 (embedded wallets, login, server wallets via `@privy-io/node`)
- Tempo mainnet (chain id 4217), viem
- Neon (serverless PostgreSQL)
- Nodemailer (Gmail SMTP) or Resend for claim emails
- Deployed on Vercel

## Run it yourself

1. Create a Privy app (enable Google, Email, X and Wallet logins; add your domain to allowed origins).
2. Create a Neon PostgreSQL database and run the SQL below.
3. Set the environment variables, then deploy to Vercel or run `npm install && npm run dev`.

### Environment variables

    NEXT_PUBLIC_PRIVY_APP_ID    Privy app id (public)
    PRIVY_APP_SECRET            Privy app secret (secret)
    DATABASE_URL                Neon connection string (secret)
    GMAIL_USER                  Gmail address used to send claim emails
    GMAIL_APP_PASSWORD          Gmail app password (secret)
    RESEND_API_KEY              optional, alternative email provider
    EMAIL_FROM                  optional, sender for Resend
    CLAIM_FEE_RESERVE           optional, network fee reserve kept on X claims (default 0.02)
    TEMPO_RPC_URL               optional, default https://rpc.tempo.xyz
    TEMPO_EXPLORER_URL          optional, default https://explore.mainnet.tempo.xyz
    NEXT_PUBLIC_TEMPO_CHAIN_ID  optional, default 4217

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
      created_at timestamptz not null default now()
    );
    create unique index users_username_lower on users (lower(username));

    create table escrows (
      id uuid primary key default gen_random_uuid(),
      created_by text not null references users(id),
      handle text not null,
      wallet_id text not null,
      address text not null,
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
      created_at timestamptz not null default now(),
      confirmed_at timestamptz
    );
    create unique index payments_tx_leg on payments (tx_hash, leg);
    create index payments_sender on payments (sender_id, created_at desc);
    create index payments_recipient on payments (recipient_user_id, created_at desc);

## Project structure

    app/
      page.tsx               landing page
      login/                 sign in
      dashboard/             overview, balance chart, recent transactions
      send/ and send/bulk/   send money, bulk send
      tips/                  tip a user or an X handle
      activity/              transaction history and receipts
      claim/[id]/            claim links (email and X) and share preview image
      u/[username]/          public profile
      settings/              profile, wallet, language
      api/                   server routes (payments, claim, recipients, balance, ...)
    lib/                     db, auth, tempo helpers, email, i18n

## Try it in 3 minutes

1. Sign in with Google and choose a username.
2. Send a few cents to a friend by @username, then by email: open the claim link in another browser and sign in with that email.
3. Tip an X handle that is not on CashPay, share the card on X, then claim it by signing in with that X account.
4. Use Bulk Send to pay three people at once and note the single wallet confirmation.
5. Open Transactions, tap a payment and screenshot the receipt.

## Known limitations and roadmap

- Unclaimed X tips stay in the escrow wallet. **Expiry and automatic refund to the sender are not built yet.**
- A small network fee reserve (default $0.02) is deducted from X claims.
- No admin control center, reconciliation worker or automated tests yet.
- Rate limiting is minimal (only escrow creation is capped).
- Claim emails sent through a new Gmail account may land in spam until the sender builds reputation. A custom domain with Resend is the production fix.
- Next: payment requests, notifications center, admin control center with audit logs, expiring claims with refunds.
