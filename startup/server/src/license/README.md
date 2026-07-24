# Timed License System

A signed, machine-bound, time-limited license that gates every app built on this framework. Works on internet-connected AND fully air-gapped servers.

## Why this exists

The DB and filesystem are within the customer's blast radius — anyone with admin access to the host can flip rows, edit files, or roll back the clock. We need an entitlement that:

1. **Can't be altered client-side.** Tampering with the token, the seal, or the database row must be detected and refused.
2. **Has a hard expiry.** Time-boxed access; the clock can't be rolled back to extend it.
3. **Is bound to one machine.** A leaked license file can't be moved to a competitor's box.
4. **Gates permissions, not just access.** Even if `RolePermission` grants `Payroll.run`, the license must also whitelist `Payroll.run`. The license is the **upper bound**.
5. **Renews cleanly online OR via sneakernet** for air-gapped installs.

## Trust model

- **Wallet** (issuer) holds the Ed25519 **private key**. Lives ONLY on the wallet, in `<SECRET_DIR>/license_keys/private/<kid>.pem`, mode 0600. Never transmitted.
- **Framework** (verifier) pins one or more wallet **public keys**. Resolution order: `LICENSE_WALLET_PUBLIC_KEYS` env var → `<SECRET_DIR>/wallet_public_keys.json` → constants baked into `pinnedKeys.js` and frozen into the bytenode build.
- **License token** is a signed blob: `NBLIC1.<base64url(payload_json)>.<base64url(signature)>`. The signature covers the header + encoded payload. See `tokenFormat.js`.
- **Seal** is a sibling signed-token mirror stored in `<SECRET_DIR>/license.seal.json` AND the `nbnext_license_local` DB row. The seal records the highest serial ever accepted and the highest wall-clock observed. Re-derived from the signed `anchor_token` on every load, so editing the JSON doesn't help an attacker — the integer is recomputed from immutable signed bytes.

## What the verifier checks at every request

1. **Signature** — Ed25519 against pinned key set.
2. **Version pin** — header must be `NBLIC1`. Defeats version-confusion splicing.
3. **App name** — `payload.app_name` must equal `APP_NAME`. A token issued for one app can't be moved to another.
4. **Machine fingerprint** — SHA-256(sorted physical MACs + OS machine-id). All required, all must still be present.
5. **Time bounds** — `not_before ≤ now ≤ expires_at`, within `max_clock_skew_seconds`.
6. **Seal** — `serial ≥ seal.highest_serial`, AND `now ≥ seal.last_wallclock - skew`. Defeats both token-rollback and clock-rollback.

If any check fails: HTTP **503** with a structured `license_invalid` body. Only `/api/v1/license/*` recovery endpoints and `/api/v1/auth/login` remain reachable so an operator can fix the install.

## File layout on a licensed host

```
<SECRET_DIR>/
  license.token              ← The signed token. Mode 0600.
  license.seal.json          ← Highest-serial anchor + wall-clock. Mode 0600.
  wallet_public_keys.json    ← Pinned wallet pubkey(s). Mode 0600 recommended.
```

Mirrored in `nbnext_license_local` (single-row table). File is canonical; DB is a fallback so deleting one doesn't brick the install AND advance-counter writes are durable.

## Renewal flows

### Online (internet-connected)

1. Hourly cron (`license-renew` job) checks if `now ≥ renewal_after`.
2. POSTs the current token to `<WALLET_SERVER_URL>/license/renew` with the local machine fingerprint.
3. Wallet verifies the token, confirms fingerprint and serial match the DB, mints a new token with `serial + 1` and a fresh `expires_at`.
4. Framework verifies the response with pinned keys, runs the full acceptance pipeline, persists to file + DB, advances the seal.

### Airgap (no outbound connectivity)

Operator-driven, two-step exchange:

1. On the air-gapped server, admin POSTs to `/api/v1/license/airgap-request`. The framework returns a JSON bundle (download attachment) containing the current token + machine fingerprint + a requested-at timestamp + nonce.
2. Operator ferries the bundle (USB, email, whatever) to a wallet-reachable workstation and POSTs it to `<WALLET_SERVER_URL>/license/airgap-renew`. The wallet validates, mints a new token bound to the same machine.
3. Operator carries the response token back to the air-gapped server and POSTs to `/api/v1/license/airgap-apply`. The framework verifies and installs it.

The bundle is timestamped; the wallet refuses any request older than 7 days, defeating stockpile-and-replay.

### Manual

`renewal_mode='manual'` means no auto-renewal cron, no airgap UI flow surfaced. Admin re-issues from scratch every cycle. Useful for short-lived demos.

## Permission gating

`requirePermission(name)` is now a layered check:

```
allowed = license.permissions.includes(name)
         AND
         user.role.permissions.includes(name)
```

Both must pass. The license is the **upper bound** — even if the DB widens what a role can do, the license can't be widened without a fresh signed token from the wallet.

`permission_caps` (e.g. `{ max_users: 50 }`) is in the payload for future resource-cap enforcement; today only the permission list is consulted.

## Setup checklist (per app)

1. Generate a wallet signing key on first wallet boot — `getOrCreateActiveKey()` does this lazily on first issue request.
2. Export the wallet public key (`GET /license/public-keys`) and pin it in the framework — either edit `pinnedKeys.js` `BAKED_KEYS` before the bytenode build, drop a `wallet_public_keys.json` into `<SECRET_DIR>`, or set `LICENSE_WALLET_PUBLIC_KEYS`.
3. On the target machine, compute its fingerprint:
   ```bash
   node scripts/license_install.js machine
   ```
4. On the wallet, issue a license for that fingerprint:
   ```
   POST /api/v1/license/issue
   { "customerId": "...", "appName": "etime-payroll",
     "machineFingerprint": "...", "permissions": ["Payroll.run", "User.read"],
     "renewalMode": "online", "validityDays": 30 }
   ```
5. Deliver the returned token to the target and install:
   ```bash
   node scripts/license_install.js install --token "NBLIC1...."
   ```
6. Start the app. The boot log should show `[license] active license_id=... serial=1 expires=...`.

## Tamper-resistance posture (honest)

- **Bytenode** materially raises the bar to patching out the license check post-build — patching V8 bytecode is harder than editing JS — but it isn't unbreakable. A motivated reverse engineer with `bytenode` source can recover and modify the verifier.
- We defend against the *common* threats: clock rollback, DB row edit, seal file edit, token swap between machines, replay of older tokens.
- We do **not** defend against an attacker who can fork the framework source, strip the gate, and rebuild — that's source-control hygiene + customer agreement territory.
- The single biggest pragmatic defense is **rotation**: licenses expire and must be re-signed. A patched build will work until the in-the-field token expires, then it stops accepting new tokens because patches don't help with crypto verification of NEW tokens (the attacker would have to generate their own keypair AND patch every install's pinned key set).

## Smoke tests

```bash
cd startup/server
node src/license/__tests__/__smoke_test__.js   # crypto + tamper + rotation + fingerprint
node src/license/__tests__/__seal_test__.js    # anti-rollback + clock-rollback
node src/license/__tests__/__e2e_test__.js     # full wallet↔framework happy path
```

Both should print `Pass: N   Fail: 0` and exit 0.

## API surface

### Framework (verifier)

| Method | Path                                | Auth | Description |
|--------|-------------------------------------|------|-------------|
| GET    | `/api/v1/license/status`            | none | Minimal status (used by UI banner + uptime probes) |
| GET    | `/api/v1/license/machine`           | admin| Machine fingerprint + raw inputs (MACs, machine-id) |
| POST   | `/api/v1/license/refresh`           | admin| Trigger online renewal against the wallet |
| POST   | `/api/v1/license/airgap-request`    | admin| Build the airgap renewal bundle (download attachment) |
| POST   | `/api/v1/license/airgap-apply`      | admin| Install a wallet-signed renewal response token |
| POST   | `/api/v1/license/install`           | admin| First-time license install (same accept pipeline) |

### Wallet (issuer)

| Method | Path                                | Auth | Description |
|--------|-------------------------------------|------|-------------|
| GET    | `/api/v1/license/public-keys`       | none | Active + retired public PEMs for pinning |
| POST   | `/api/v1/license/issue`             | admin| Issue a new license |
| POST   | `/api/v1/license/renew`             | none | Online renewal (auth IS the held current token) |
| POST   | `/api/v1/license/airgap-renew`      | none | Airgap renewal (auth IS the bundled current token) |
| POST   | `/api/v1/license/revoke`            | admin| Mark license revoked; future renewals refused |
| GET    | `/api/v1/license/:licenseId`        | admin| Status + audit info |
