import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

// Single chokepoint for per-page SEO tags. Renders <title>, description,
// OpenGraph, Twitter, canonical, and optional JSON-LD structured data.
//
// Defaults come from VITE_APP_* env baked at build time (see vite.config.js)
// and are overridden per-route by passing props. Always pass a `title` and
// `description` from public/landing pages — they're the highest-impact SEO
// signals and the Google search-result preview comes from them.

const DEFAULTS = {
  appName: import.meta.env.VITE_APP_PUBLIC_NAME || 'NB Next',
  description: import.meta.env.VITE_APP_PUBLIC_DESCRIPTION || 'Integrated AI based IOT 4.0 platforms',
  url: import.meta.env.VITE_APP_PUBLIC_URL || '',
  imageUrl: import.meta.env.VITE_APP_PUBLIC_OG_IMAGE || '/icons/og-default.png',
  twitterHandle: import.meta.env.VITE_APP_TWITTER_HANDLE || '',
  locale: import.meta.env.VITE_APP_LOCALE || 'en_US',
};

/**
 * Per-page SEO meta. Drop into the top of any public page component.
 *
 * @param {object} props
 * @param {string} props.title         — Page title (will be suffixed with app name).
 * @param {string} [props.description] — Meta description; falls back to app default.
 * @param {string} [props.path]        — URL path for canonical + og:url (e.g. "/signup").
 * @param {string} [props.image]       — Absolute or root-relative URL of OG image.
 * @param {boolean} [props.noIndex]    — Set robots=noindex,nofollow for authed/private pages.
 * @param {object} [props.jsonLd]      — Optional JSON-LD object; serialized into a <script>.
 */
function PageMeta({
  title,
  description,
  path,
  image,
  noIndex = false,
  jsonLd,
}) {
  const fullTitle = title ? `${title} · ${DEFAULTS.appName}` : DEFAULTS.appName;
  const desc = description || DEFAULTS.description;
  // Build a canonical URL only if we have a configured base URL; otherwise
  // leave it off — a wrong canonical is worse than no canonical at all.
  const canonical = DEFAULTS.url && path ? `${DEFAULTS.url.replace(/\/$/, '')}${path}` : null;
  const og = image || DEFAULTS.imageUrl;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {canonical && <link rel="canonical" href={canonical} />}

      {/* OpenGraph (Facebook, LinkedIn, Slack, WhatsApp link previews). */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={DEFAULTS.appName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {canonical && <meta property="og:url" content={canonical} />}
      {og && <meta property="og:image" content={og} />}
      <meta property="og:locale" content={DEFAULTS.locale} />

      {/* Twitter card. summary_large_image gets the full-width preview. */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {og && <meta name="twitter:image" content={og} />}
      {DEFAULTS.twitterHandle && <meta name="twitter:site" content={DEFAULTS.twitterHandle} />}

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}

PageMeta.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  path: PropTypes.string,
  image: PropTypes.string,
  noIndex: PropTypes.bool,
  jsonLd: PropTypes.object,
};

// Helpers for the most common structured-data shapes. Use these instead of
// hand-rolling JSON-LD blobs — keeps the schema names consistent and
// reduces typos in `@type` (which Google silently ignores).

function organizationJsonLd({ name, url, logoUrl }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: name || DEFAULTS.appName,
    url: url || DEFAULTS.url,
    ...(logoUrl ? { logo: logoUrl } : {}),
  };
}

function softwareApplicationJsonLd({
  name, description, applicationCategory = 'BusinessApplication',
  operatingSystem = 'Web',
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: name || DEFAULTS.appName,
    description: description || DEFAULTS.description,
    applicationCategory,
    operatingSystem,
  };
}

export { PageMeta, organizationJsonLd, softwareApplicationJsonLd };
