/**
 * App-specific route → document-title knowledge, registered into startup's
 * route-title registry at boot (see registerAppData). Startup only knows its
 * framework routes; these are this product's own pages.
 */

/** Exact-path titles for app pages that aren't derivable from a module def. */
const appRouteTitles = {
  '/admin/dashboards': 'Dashboards',
  '/admin/dashboard': 'Dashboards',
};

/**
 * Pattern titles for dynamic sub-routes. Ordered — first match wins.
 */
const appTitlePatterns = [
  { pattern: /^\/admin\/dashboard\//, title: 'Dashboards' },
];

/** App-specific private path prefixes marked noIndex (in addition to /admin). */
const appPrivatePathPrefixes = [];

export { appRouteTitles, appTitlePatterns, appPrivatePathPrefixes };
