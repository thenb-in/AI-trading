---
id: getting-started
title: 1. Getting started
sidebar_position: 1
slug: /
keywords: [login, log in, sign in, password, forgot password, reset password, sign up, register, new account, first login, two factor, 2fa, totp, authenticator, otp, approval, pending approval, company]
---

# User Manual {#getting-started}

How to sign in, get your account ready, and start working.

## Sign up {#sign-up}

Create a new account when you first need access.

1. Go to **/signup**.
2. Fill in every required field:

   | Field | Required | Notes |
   |-------|----------|-------|
   | Username | Yes | Unique — used to sign in |
   | Password | Yes | Your account password |
   | Name | Yes | Your display name |
   | Phone | Yes | Contact number |
   | Company ID | No | Pre-filled when you arrive on an invite link |

3. Submit. Your account is created **pending approval**.

You cannot sign in until an administrator approves the account.

- A username already in use by an **active** account is rejected.
- A username left behind by an **inactive** account is reactivated.
- A Company ID that does not exist is rejected.

## Sign in {#sign-in}

1. Go to **/** (the login page).
2. Enter username and password, then **Login**.
3. On your **first** login you are asked to set a new password.
4. If your account has no company yet, you are taken to onboarding.

Once in, you land on the dashboard.

Common stops:

- **Account not approved** — wait for an administrator.
- **Account not found** — the account was deactivated.
- **First login** always forces a password change — this is expected.

## Forgot password {#forgot-password}

1. Go to **/forgot-password**.
2. Enter your username and a new password.
3. If you have two-factor enabled, enter the current authenticator code.
4. Submit.

- **With a valid code** — the password changes and you can sign in straight away.
- **Without a code** — the password changes but the account returns to **pending approval**, so an administrator must re-approve it.

## Two-factor authentication {#two-factor}

Adds an authenticator-app code on top of your password.

1. Sign in and open the two-factor setup.
2. **Generate secret** — a QR code appears.
3. Scan it with an authenticator app (Google Authenticator, Authy, and the like).
4. Enter the 6-digit code and **Verify and enable**.

Once enabled, the authenticator code lets you reset your own password immediately (see above). Keep access to the authenticator app — without it a reset falls back to administrator approval.

## First-time company setup {#onboarding}

Shown automatically after login when your account has no company.

1. Enter the **company name**.
2. Choose which devices may access it — desktop web, mobile web, mobile app.
3. **Create company**.

The company is created, you are assigned to it, and you continue into the app.
