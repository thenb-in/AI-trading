
/** Exact-path titles for app pages that aren't derivable from a module def. */
const appRouteTitles = {
  '/admin/dashboards': 'Dashboards',
  '/admin/dashboard': 'Dashboards',
  '/admin/hr-dashboard': 'HR Dashboard',
  '/admin/checklist': 'Checklist',
  '/admin/wagemaster/dashboard': 'WageMaster Dashboard',
  '/admin/wagemaster/activities': 'Activities',
  '/admin/identify-officer': 'Identify Officer',
  '/admin/quick-check-in': 'Quick Check-In',
  '/admin/salarymitra/biometric': 'Biometric Check-In',
  '/admin/wagemaster/log-history': 'Log History',
  '/admin/wagemaster/feedback': 'Feedback',
};

/**
 * Pattern titles for dynamic sub-routes. Ordered — first match wins, so the
 * specific per-user dashboard sits before the general WageMaster prefix.
 */
const appTitlePatterns = [
  { pattern: /^\/admin\/wagemaster\/dashboard\/[^/]+$/, title: 'WageMaster User Dashboard' },
  { pattern: /^\/admin\/dashboard\//, title: 'Dashboards' },
  { pattern: /^\/admin\/wagemaster\//, title: 'WageMaster' },
];

/** App-specific private path prefixes marked noIndex (in addition to /admin). */
const appPrivatePathPrefixes = ['/salarymitra', '/wagemaster'];

export { appRouteTitles, appTitlePatterns, appPrivatePathPrefixes };
