'use strict';

// SSO accounts (created by this wallet acting as an OIDC provider; marked by a
// non-null wallet_user_id) are confined to user-management. Server-side mirror
// of the client's ProtectedRoute redirect: they may only call the framework's
// user + auth-management endpoints, and permission checks are bypassed for them
// on those routes (they carry no role/permissions of their own).
//
// These are framework routes, so the allowed-list lives in core. Apps that need
// to widen it (e.g. an app-specific user-admin endpoint) call
// registerSsoUserAllowedPatterns() at boot — core never imports the app.

const SSO_USER_ALLOWED_API = [
  /^\/api\/v1\/users(\/|$)/,
  /^\/api\/v1\/auth\/approve(\/|$)/,
  /^\/api\/v1\/auth\/roles(\/|$)/,
  /^\/api\/v1\/auth\/logout(\/|$)/
];

/** Let an app add extra request-path patterns SSO users may reach. */
const registerSsoUserAllowedPatterns = (...patterns) => {
  for (const pattern of patterns.flat()) {
    if (pattern instanceof RegExp) {
      SSO_USER_ALLOWED_API.push(pattern);
    }
  }
};

/** Whether an SSO account is allowed to call this request path. */
const isSsoUserAllowedPath = (urlPath) => {
  const path = String(urlPath || '').split('?')[0];
  return SSO_USER_ALLOWED_API.some((allowed) => allowed.test(path));
};

// A "managed" SSO account is one that signed up THROUGH this instance acting as
// the OIDC provider — the provider signup path stamps wallet_user_id = its own
// id (a self-reference). These are the accounts confined to user-management.
//
// This is distinct from being merely SSO-LINKED: a relying-party app (e.g.
// etime) provisions a local user whose wallet_user_id is the REMOTE provider
// user id (!= its own id). Those are ordinary app users and must NOT be
// confined — so confinement keys off this self-reference, not wallet_user_id
// alone.
const isSsoManagedAccount = (user) => {
  if (!user) {
    return false;
  }
  const walletUserId = user.wallet_user_id;
  const id = user.id;
  return Boolean(walletUserId) && Boolean(id) && String(walletUserId) === String(id);
};

module.exports = {
  registerSsoUserAllowedPatterns,
  isSsoUserAllowedPath,
  isSsoManagedAccount
};
