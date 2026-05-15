'use strict';

// Verifier-side license constants. Mirror of the wallet's
// `nbnext_wallet/server/src/constants/license.js` — the header value
// in particular MUST be byte-for-byte identical, it's the version-pin
// stamped into every signed token.

const LICENSE_TOKEN_HEADER = 'NBLIC1';
const ED25519_SIGNATURE_BYTES = 64;

// On-disk locations under `<SECRET_DIR>/`.
const LICENSE_TOKEN_FILENAME = 'license.token';
const LICENSE_SEAL_FILENAME = 'license.seal.json';
const WALLET_KEYS_FILENAME = 'wallet_public_keys.json';

// Defaults used when a token doesn't carry the field. Tokens issued by
// the wallet always carry max_clock_skew_seconds, but very old / hand-
// crafted ones might not.
const DEFAULT_CLOCK_SKEW_SECONDS = 300;
const DEFAULT_CLOCK_SKEW_MS = DEFAULT_CLOCK_SKEW_SECONDS * 1000;

// Convenience.
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const WALLET_RENEW_TIMEOUT_MS = 15000;

// Reasons returned by the verifier's acceptance pipeline. Routes /
// dashboards / install scripts pattern-match on these — treat them as
// part of the public contract.
const VERIFY_REASONS = Object.freeze({
  ENFORCEMENT_DISABLED: 'enforcement_disabled',
  NO_PINNED_KEYS: 'no_pinned_keys',
  NO_LICENSE: 'no_license',
  NOT_LOADED: 'not_loaded',
  NOT_YET_VALID: 'not_yet_valid',
  EXPIRED: 'expired',
  APP_NAME_MISMATCH: 'app_name_mismatch',
  SERIAL_ROLLBACK: 'serial_rollback',
  CLOCK_ROLLBACK: 'clock_rollback'
});

// Error messages thrown from the license service.
const LICENSE_ERRORS = Object.freeze({
  NO_CURRENT_LICENSE: 'no_current_license_to_renew',
  WALLET_URL_NOT_CONFIGURED: 'WALLET_SERVER_URL not configured',
  WALLET_RENEW_FAILED: 'wallet_renew_failed',
  WALLET_RENEW_NO_TOKEN: 'wallet_renew_returned_no_token',
  RENEW_VERIFY_FAILED: 'renew_token_verify_failed',
  RENEW_REJECTED: 'renew_token_rejected_locally',
  AIRGAP_VERIFY_FAILED: 'airgap_token_verify_failed',
  AIRGAP_REJECTED: 'airgap_token_rejected',
  TOKEN_REQUIRED: 'token_required',
  FP_NO_MACS: 'machine_fingerprint: no physical MAC addresses detected',
  FP_NO_MACHINE_ID: 'machine_fingerprint: machine-id unavailable on this platform'
});

module.exports = {
  LICENSE_TOKEN_HEADER,
  ED25519_SIGNATURE_BYTES,
  LICENSE_TOKEN_FILENAME,
  LICENSE_SEAL_FILENAME,
  WALLET_KEYS_FILENAME,
  DEFAULT_CLOCK_SKEW_SECONDS,
  DEFAULT_CLOCK_SKEW_MS,
  MS_PER_DAY,
  ONE_HOUR_MS,
  WALLET_RENEW_TIMEOUT_MS,
  VERIFY_REASONS,
  LICENSE_ERRORS
};
