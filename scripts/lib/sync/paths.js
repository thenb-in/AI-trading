//
// paths.js — the path sets both directions classify against.
//
// Kept in one place because the two directions agree on almost all of it;
// where they differ, the direction config says so and says why.
//

// Framework folders. A commit touching at least one of these is what makes
// the commit eligible to cross at all.
const FRAMEWORK_PREFIXES = [
  'startup/',
  // Shared, framework-agnostic infra (logger, generic constants, env/config)
  // that startup/server/* re-exports via thin shims and the @nucleus alias.
  // Without syncing nucleus/, those shims land without their implementation
  // and the server fails to boot ("Cannot find module ../../nucleus/logger").
  'nucleus/',
  // Standalone socket-RPC report runner. Framework plumbing (depends on
  // @startup socket infra); ships with the template so apps can offload
  // report execution.
  'report_runner/',
  'lints/',
  'deploy/',
  // Carries the sync workflows themselves, which is how this machinery
  // reaches an app repo in the first place. Safe to move both ways only
  // because of the echo-trailer guard in rules.isEchoCommit — without it
  // these files would bounce between the repos forever.
  '.github/',
  '.vscode/',
  '.husky/',
];

// Framework tooling that doesn't sit under a framework folder. These must be
// classified framework rather than app, because app paths are only picked
// when the target already has the file — and a repo that has never run the
// sync doesn't, so the tooling could never arrive.
const FRAMEWORK_FILES = [
  /^scripts\/lib\/sync\//,
  /^scripts\/sync-startup\.js$/,
  /^scripts\/sync-framework\.js$/,
  /^scripts\/check-sync-conflicts\.js$/,
];

// Never crosses, in either direction.
const NEVER_PICK = [
  // Mostly app-specific.
  /^tests\//,
  // Manifests and lockfiles tie name, version and deps to a repo's identity;
  // syncing them across breaks the target. The cost is that a framework
  // change needing a new runtime dep has to be vendored by hand — the run
  // reports those rather than dropping them silently.
  /(^|\/)package\.json$/,
  /(^|\/)package-lock\.json$/,
  // Per-app content living under a framework path. AppDashboard.jsx
  // registers the app's concrete routes (imports @app/components/masters/*
  // etc.); the framework template must keep it an empty `appRoutes = []`
  // scaffold or the template fails to build, and the app must keep its real
  // one. Neither side may overwrite the other.
  /^startup\/client\/src\/pages\/AppDashboard\.jsx$/,
  // Parked conflicts and their report are per-repo review state, not content.
  /^sync-conflicts\//,
];

const NEVER_PICK_REASON =
  '`tests/`, all `package.json`, all `package-lock.json`, ' +
  '`startup/client/src/pages/AppDashboard.jsx`, `sync-conflicts/`';

const BOT_NAME = process.env.GIT_SYNC_USER_NAME || 'startup-sync-bot';
const BOT_EMAIL =
  process.env.GIT_SYNC_USER_EMAIL || 'startup-sync-bot@users.noreply.github.com';

module.exports = {
  FRAMEWORK_PREFIXES,
  FRAMEWORK_FILES,
  NEVER_PICK,
  NEVER_PICK_REASON,
  BOT_NAME,
  BOT_EMAIL,
};
