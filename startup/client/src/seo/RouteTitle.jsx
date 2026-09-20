import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PageMeta } from './PageMeta';
import { reports } from '@data/getReportModules';
import { getMasterModules } from '@data/getMasterModules';
import { getAppModuleDefinitions } from '@data/getAppModules';
import {
  getAppStaticTitles,
  getAppTitlePatterns,
  getAppPrivatePathPrefixes,
} from './routeTitleRegistry';

// Per-route document <title> for every page in the app. Without this the
// title sticks at whatever the last <PageMeta>-emitting page set it to —
// authed admin routes have no per-page meta of their own, so e.g. landing
// at /admin/reports after signing in left the tab labelled "Sign in".

// The reports / app-module / master lists are populated by the app at boot
// (registered as a side-effect import in main.jsx). These lookup maps are
// therefore built lazily on first resolveTitle() call — which happens at
// render, after boot — not at module eval, which would capture empty lists.
let reportTitleBySlug = null;
let appTitleByPath = null;
let masterTitleByKey = null;

function getReportTitleBySlug() {
  if (reportTitleBySlug) return reportTitleBySlug;
  const map = {};
  for (const r of reports) {
    if (r.slug && r.title) map[r.slug] = r.title;
  }
  reportTitleBySlug = map;
  return map;
}

function getAppTitleByPath() {
  if (appTitleByPath) return appTitleByPath;
  const map = {};
  for (const def of getAppModuleDefinitions()) {
    if (def.navigatePath && def.title) map[def.navigatePath] = def.title;
  }
  appTitleByPath = map;
  return map;
}

// Master modules expose their URL key only via `onClick: () => handler(key)`.
// Pass a capturing handler and invoke each onClick to harvest a key→title map
// without changing the data file or duplicating the entries.
function getMasterTitleByKey() {
  if (masterTitleByKey) return masterTitleByKey;
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
  masterTitleByKey = map;
  return map;
}


const GENERIC_STATIC_TITLES = {
  '/': 'Sign in',
  '/wallet': 'Sign in',
  '/signup': 'Sign up',
  '/forgot-password': 'Forgot password',
  '/admin': 'Navigator',
  '/admin/navigator': 'Navigator',
  '/admin/reports': 'Reports',
  '/admin/report': 'Reports',
  '/admin/report/manager': 'Reporting Manager',
  '/admin/masters': 'Masters',
  '/admin/master': 'Masters',
  '/admin/master/users': 'User Management',
  '/admin/master/activity': 'Audit Logs',
  '/admin/master/nbnext-drive': 'NBnext Drive',
  '/admin/master/cache': 'Cache Manager',
  '/admin/master/notification-rule': 'Notification Rules',
  '/admin/master/report-run': 'Reporting Manager',
  '/admin/master/geography': 'Geography',
  '/admin/master/announcement': 'Announcements',
  '/admin/users': 'User Management',
  '/admin/company': 'Company Settings',
  '/admin/role-permissions': 'Roles & Permissions',
  '/admin/multi-company-setup': 'Multi-Company Setup',
  '/admin/subscription': 'Subscription',
  '/admin/app-guide': 'App Guide',
  '/admin/help-support': 'Help & Support',
};

let staticTitles = null;
let privatePathPrefixes = null;

function getStaticTitles() {
  if (staticTitles) return staticTitles;
  staticTitles = { ...GENERIC_STATIC_TITLES, ...getAppStaticTitles() };
  return staticTitles;
}

function getPrivatePathPrefixes() {
  if (privatePathPrefixes) return privatePathPrefixes;
  privatePathPrefixes = ['/admin', ...getAppPrivatePathPrefixes()];
  return privatePathPrefixes;
}

function resolveTitle(rawPath) {
  if (!rawPath) return null;
  const path = rawPath === '/' ? '/' : rawPath.replace(/\/+$/, '');

  if (getStaticTitles()[path]) return getStaticTitles()[path];
  if (getAppTitleByPath()[path]) return getAppTitleByPath()[path];

  const reportMatch = path.match(/^\/admin\/report\/([^/]+)$/);
  if (reportMatch) {
    return getReportTitleBySlug()[reportMatch[1]] || 'Reports';
  }

  const masterMatch = path.match(/^\/admin\/master\/([^/]+)$/);
  if (masterMatch) {
    return getMasterTitleByKey()[masterMatch[1]] || 'Masters';
  }

  for (const { pattern, title } of getAppTitlePatterns()) {
    if (pattern.test(path)) return title;
  }

  if (path.startsWith('/admin/')) return 'Admin';

  return null;
}

function RouteTitle() {
  const { pathname } = useLocation();
  const title = useMemo(() => resolveTitle(pathname), [pathname]);
  if (!title) return null;
  const isPrivate = getPrivatePathPrefixes().some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return <PageMeta title={title} noIndex={isPrivate} />;
}

export { RouteTitle, resolveTitle };
