# CashPay

**Money for the social internet.** Send money just like sending a message.

CashPay is a stablecoin payments app built on **Tempo mainnet**. Pay anyone with a **@username**, an **email address**, an **X handle** or a **wallet address**. The person you pay does not need a wallet or any crypto knowledge: they sign in and the money is theirs. If they never claim it, it returns to you.

- Live app: https://www.cashpayt.xyz
- X: https://x.com/CashPay_
- Security policy: see `SECURITY.md`

> Status: public alpha on Tempo mainnet with real funds. Use small amounts while testing.

## Judge's quick tour (about 3 minutes)

1. Open https://www.cashpayt.xyz and sign in with Google, email, X or a passkey.
2. **Wallet** page: your address, balances (USDT, USDC, OUSD, pathUSD) and history, including deposits from other wallets.
3. **Send** a few cents by @username. Then send to an email address that is not on CashPay and open the claim link in another browser.
4. **Tips**: tip an X handle that is not on CashPay and claim it by signing in with that X account.
5. **Bulk Send**: pay several people in one transaction.
6. **Transactions**: tap a payment to see the receipt, the claim state, the expiry date and the "Return money to my wallet" button.

## What you can do

- **Sign in** with Google, email, X, a wallet or a passkey. A secure embedded wallet is created for you (Privy).
- **Send money** to a @username, email, X handle or wallet address in **USDT, USDC, OUSD or pathUSD**, with an optional message and a **Max** button.
- **Pay people who are not on CashPay yet**
  - **Email:** they get a claim link and sign in with that email (code or Google).
  - **X handle:** they claim by signing in with X. If they linked X to their CashPay profile, the tip goes **straight into their wallet** with no claim step.
- **Expiry and refunds:** unclaimed email and X payments return to the sender after **30 days**.
- **Bulk Send:** up to 20 people in one transaction, one signature, one network fee.
- **Tips**, **receipts** you can screenshot, share cards for X, and a shareable batch page for many tips at once.
- **Wallet page, Profile page** (photo, bio, linked X account, security), **Notifications**, **6 languages** (English, Chinese, French, Arabic, Hindi, Hausa), light and dark mode, mobile first.

## How it works

    Registered user, or X account linked to a wallet
        -> the sender signs a transfer -> funds go straight to that wallet

    Email or X handle not on CashPay
        -> funds go to a one-time escrow wallet (Privy server wallet)
        -> the recipient signs in (email / Google / X) and Privy verifies who they are
        -> the server checks it matches the recipient and sends the funds to their new wallet

    Nobody claims within 30 days
        -> the escrow returns the funds to the sender (daily cron, or the sender taps
           "Return money to my wallet")

Every payment is **verified on-chain by the server**. A payment is only marked `CONFIRMED` after the server reads the Tempo transaction receipt and checks the token transfer log (sender, recipient, amount and token).

## Security model

### What we hold, and who can move it

- **User wallets:** embedded wallets managed by Privy. CashPay never sees private keys or seed phrases.
- **Escrow wallets:** one Privy server wallet per unclaimed payment, controlled by the CashPay server through `PRIVY_APP_SECRET`. This is the main trust assumption of the app. Funds are only moved by two server code paths: a verified **claim** (to the verified recipient) and a **refund** (to the original sender, only after expiry).

### Threats and mitigations

    Threat                                  Mitigation                                                   Status
    --------------------------------------  -----------------------------------------------------------  -----------
    Calling the API without being logged in Privy access token verified on the server for every call    Done
    Fake or altered payment records         Server verifies the Tempo receipt logs before CONFIRMED      Done
    Double claim / double refund (races)    Atomic DB locks (CLAIMING, REFUNDING), idempotent by tx hash Done
    Claiming someone else's money           Privy-verified X account or email must match the recipient   Done
    Money stuck in escrow forever           30 day expiry, then refund (cron and manual button)          Done
    Stolen phone or session                 Optional passkey (fingerprint) MFA before wallet signing     Done (opt-in)
    Injection and malformed input           Zod validation, parameterized SQL, escaped email content     Done
    Malicious profile photos                Re-encoded to JPEG in the browser, validated on the server   Done
    Spam and abuse                          Cap on new escrows per user per day, search is auth-only     Minimal
    Escrow secret compromise                Secret only in environment variables; exposure limited by    Open risk
                                            the 30 day expiry; roadmap below
    Custom smart contract bugs              No custom contract holds funds today                         Not applicable

### Passkey (fingerprint) protection

- In **Profile -> Security** a user can turn on fingerprint, face or screen-lock protection (a passkey, through Privy MFA). Once enrolled, Privy asks for it when the wallet signs a payment. After one confirmation the same device stays unlocked for about 15 minutes (Privy behaviour).
- Setting `NEXT_PUBLIC_REQUIRE_PASSKEY=1` makes the app refuse to start a payment until the user has enrolled. This check is in the UI; the protection itself is enforced by Privy for enrolled accounts.
- Users can also add a passkey to sign in with it (**Profile -> Security -> Add a passkey for sign-in**).
- Passkeys are tied to the site domain, so use https://www.cashpayt.xyz.

### Known limitations (we want to be upfront)

- Escrowed funds are **custodial until claimed or returned**. A leaked `PRIVY_APP_SECRET` would put escrowed funds at risk. Keep it secret and rotate it if in doubt.
- No external security audit and no automated test suite yet.
- X claims match the X account Privy verified; the permanent X user id is used when it is known, otherwise the handle. A handle that changes hands could be claimed by its new owner; the 30 day expiry limits this.
- Rate limiting is minimal (new escrows are capped per user per day).
- Email payments sent before escrow was introduced went directly to a pre-generated wallet and have no expiry.
- The passkey requirement is optional and not enabled by default.
- Dependency versions are not fully pinned yet (no lockfile committed).
- Emails from a new Gmail sender may land in spam. A custom domain with Resend is the production fix.
- Running with Privy development-mode credentials during the hackathon.

### Roadmap

- Privy wallet policies for the escrow wallets (restrict where escrowed funds can go).
- An **on-chain claim escrow contract** with expiry and refund, so escrowed funds no longer depend on a server secret.
- Automated tests, dependency pinning and an external security review.
- Admin control center with audit logs and reconciliation.

## What's new

- Unclaimed email and X payments **expire after 30 days and return to the sender** (daily cron and manual button). Email payments now use escrow and can be claimed with an email code or Google.
- **Link X account** in Profile: tips to your @handle go straight into your wallet.
- **Passkey support:** sign in with a passkey and optional fingerprint protection for payments.
- **Wallet, Profile and Notifications** pages, mobile bottom navigation, **Refresh** buttons, **Max** button, bulk batch share page.
- USDT, USDC, OUSD and pathUSD, six languages, branded claim emails, new domain https://www.cashpayt.xyz.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript
- Privy v3 (embedded wallets, login, passkeys, MFA, server wallets via `@privy-io/node`)
- Tempo mainnet (chain id 4217), viem
- Neon (serverless PostgreSQL)
- Nodemailer (Gmail SMTP) or Resend for emails
- Vercel hosting and Vercel Cron

## Run it yourself

1. Create a Privy app (enable Google, Email, X, Wallet and Passkey; enable MFA with passkeys; add your domain to allowed origins).
2. Create a Neon database and run the SQL below.
3. Set the environment variables and deploy to Vercel (the daily refund cron is in `vercel.json`).

### Environment variables

    NEXT_PUBLIC_PRIVY_APP_ID       Privy app id (public)
    PRIVY_APP_SECRET               Privy app secret (secret)
    DATABASE_URL                   Neon connection string (secret)
    CRON_SECRET                    random string protecting the refund cron (secret)
    GMAIL_USER                     Gmail address used to send emails
    GMAIL_APP_PASSWORD             Gmail app password (secret)
    RESEND_API_KEY                 optional, own-domain email (secret)
    EMAIL_FROM                     optional, e.g. CashPay <noreply@yourdomain>
    APP_URL                        optional, base URL used in emails
    CLAIM_FEE_RESERVE              optional, fee reserve kept on claims and refunds (default 0.02)
    NEXT_PUBLIC_CLAIM_DAYS         optional, days shown in the app (default 30, keep in sync with the SQL trigger)
    NEXT_PUBLIC_SITE_URL           optional, default https://www.cashpayt.xyz (Share on X links)
    NEXT_PUBLIC_REQUIRE_PASSKEY    optional, set to 1 to require passkey protection before sending

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
      login/                  sign in (including passkey)
      dashboard/ wallet/ profile/ activity/ settings/   signed-in pages
      send/ send/bulk/ tips/  sending money
      claim/[id]/ batch/[hash]/   claim links and batch share pages
      u/[username]/           public profile
      api/                    server routes (payments, claim, refund, cron, notifications, ...)
    lib/                      db, auth, Tempo helpers, escrow, refund, email, passkey, i18n
