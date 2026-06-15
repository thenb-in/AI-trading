import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PageMeta } from './PageMeta';
import { reports } from '@app/data/getReportModules';
import { getMasterModules } from '@app/data/getMasterModules';
import { getAppModuleDefinitions } from '@app/data/getAppModules';

// Per-route document <title> for every page in the app. Without this the
// title sticks at whatever the last <PageMeta>-emitting page set it to —
// authed admin routes have no per-page meta of their own, so e.g. landing
// at /admin/reports after signing in left the tab labelled "Sign in".

const REPORT_TITLE_BY_SLUG = (() => {
  const map = {};
  for (const r of reports) {
    if (r.slug && r.title) map[r.slug] = r.title;
  }
  return map;
})();

const APP_TITLE_BY_PATH = (() => {
  const map = {};
  for (const def of getAppModuleDefinitions()) {
    if (def.navigatePath && def.title) map[def.navigatePath] = def.title;
  }
  return map;
})();

// Master modules expose their URL key only via `onClick: () => handler(key)`.
// Pass a capturing handler and invoke each onClick to harvest a key→title map
// without changing the data file or duplicating the entries.
const MASTER_TITLE_BY_KEY = (() => {
  const map = {};
  let captured = null;
  const capture = (k) => { captured = k; };
  const modules = getMasterModules(capture);
  for (const m of modules) {
    captured = null;
    try {
      if (typeof m.onClick === 'function') m.onClick();
    } catch {
      // onClick should be a no-op via the capture handler; ignore the rest.
    }
    if (captured && m.title) map[captured] = m.title;
  }
  return map;
})();

const STATIC_TITLES = {
  '/': 'Sign in',
  '/signup': 'Sign up',
  '/forgot-password': 'Forgot password',
  '/admin': 'Navigator',
  '/admin/navigator': 'Navigator',
  '/admin/reports': 'Reports',
  '/admin/report': 'Reports',
  '/admin/report/past-report': 'Past Reports',
  '/admin/masters': 'Masters',
  '/admin/master': 'Masters',
  '/admin/master/users': 'User Management',
  '/admin/master/activity': 'Audit Logs',
  '/admin/master/nbnext-drive': 'NBnext Drive',
  '/admin/users': 'User Management',
  '/admin/company': 'Company Settings',
  '/admin/role-permissions': 'Roles & Permissions',
  '/admin/multi-company-setup': 'Multi-Company Setup',
  '/admin/subscription': 'Subscription',
  '/admin/app-guide': 'App Guide',
  '/admin/help-support': 'Help & Support',
};

function resolveTitle(rawPath) {
  if (!rawPath) return null;
  const path = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');

  if (STATIC_TITLES[path]) return STATIC_TITLES[path];
  if (APP_TITLE_BY_PATH[path]) return APP_TITLE_BY_PATH[path];

  const reportMatch = path.match(/^\/admin\/report\/([^/]+)$/);
  if (reportMatch) {
    return REPORT_TITLE_BY_SLUG[reportMatch[1]] || 'Reports';
  }

  const masterMatch = path.match(/^\/admin\/master\/([^/]+)$/);
  if (masterMatch) {
    return MASTER_TITLE_BY_KEY[masterMatch[1]] || 'Masters';
  }

  if (path.startsWith('/admin/')) return 'Admin';

  return null;
}

const PRIVATE_PATH_PREFIXES = ['/admin'];

function RouteTitle() {
  const { pathname } = useLocation();
  const title = useMemo(() => resolveTitle(pathname), [pathname]);
  if (!title) return null;
  const isPrivate = PRIVATE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return <PageMeta title={title} noIndex={isPrivate} />;
}

export { RouteTitle, resolveTitle };
