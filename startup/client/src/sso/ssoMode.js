// RP / SSO-consumer switch (client side).
//
// When VITE_SSO_ENABLED=true, this app authenticates via the external SSO
// identity provider: the entry page redirects to /api/v1/auth/sso/start and
// logout follows the server-provided ssoLogoutUrl. When false/unset (default),
// the app uses plain local username/password login and a local logout with no
// SSO redirect. Independent of the server-side SSO_PROVIDER_ENABLED (which makes
// this app an identity *provider*).
const isSsoEnabled = () => import.meta.env.VITE_SSO_ENABLED === 'true';

export { isSsoEnabled };
