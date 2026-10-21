# Security policy

CashPay is a public alpha running on Tempo mainnet with real funds. Please test with small amounts.

## Reporting a vulnerability

Please report privately and do not open a public issue:

- Use GitHub: **Security -> Report a vulnerability** on this repository, or
- Send a direct message to https://x.com/CashPay_

Include steps to reproduce and the impact. We will acknowledge your report, fix confirmed issues and credit you if you wish. Please do not access other people's funds or data while testing.

## Scope

- The web app at https://www.cashpayt.xyz and its API routes (`app/api/*`)
- Payment verification, claim, expiry and refund logic
- Wallet and escrow handling

Out of scope: Privy, Tempo, Vercel, Neon and other third-party services (report those to the vendor).

## What protects users today

- Every API route verifies the Privy access token on the server.
- Payments are marked confirmed only after the server verifies the Tempo transaction receipt (token, sender, recipient, amount).
- Atomic database locks prevent double claims and double refunds.
- Claims require a Privy-verified match with the recipient (X account or email).
- Unclaimed escrow payments expire after 30 days and return to the sender.
- Optional passkey (fingerprint) protection for wallet signing, through Privy MFA.

## Known risks

- Unclaimed payments sit in escrow wallets controlled by the CashPay server (Privy server wallets). If `PRIVY_APP_SECRET` were compromised, escrowed funds could be moved. Exposure is limited in time by the 30 day expiry.
- No external audit and no automated test suite yet.
- Dependency versions are not fully pinned yet.
