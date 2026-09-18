#!/usr/bin/env node
//
// sync-startup.js — app repo -> framework repo (`thenb-in/startup`).
//
// Run BY an app repo (see .github/workflows/sync-startup.yml). Replays the
// app's framework-relevant commits, one target commit per source commit with
// the original author, date and subject preserved, onto a standing sync
// branch in the framework repo, and the workflow opens one PR from it.
//
// Rules — see scripts/lib/sync/paths.js for the path sets and why:
//   * A commit must touch at least one FRAMEWORK path to cross at all.
//   * FRAMEWORK and DB-SCRIPT changes on such a commit are always applied.
//   * APP changes are applied only when the framework repo already has the
//     file — sync never creates a new app file there.
//   * NEVER-PICK changes are dropped (logged for visibility).
//   * Merge commits are skipped; their content came from their parents.
//   * Commits this sync already brought IN from the framework are skipped,
//     so nothing round-trips.
//
// Conflict policy: `source-wins`. The framework repo is downstream of the app
// for these paths, so divergent content there is overwritten rather than
// merged. The reverse direction is the one that has to reconcile — see
// scripts/sync-framework.js.
//
// Usage:
//   node scripts/sync-startup.js \
//     --source-repo=. --target-repo=../startup \
//     --target-branch=sync/from-<app> [--start-from=<sha>] [--log-dir=…]
//

const { run, parseArgs } = require('./lib/sync/engine');
const { repoSlug, trailerKeyFor } = require('./lib/sync/label');
const {
  FRAMEWORK_PREFIXES,
  FRAMEWORK_FILES,
  NEVER_PICK,
  NEVER_PICK_REASON,
  BOT_NAME,
  BOT_EMAIL,
} = require('./lib/sync/paths');

const args = parseArgs(process.argv);
const appSlug = repoSlug(args['source-repo'] || '.', 'app');

run({
  key: 'sync-startup',
  title: `${appSlug} → startup`,
  sourceLabel: appSlug,
  targetLabel: 'startup',
  sourceBranch: 'main',
  defaultBranchName: `sync/from-${appSlug}`,

  // Commits crossing this way are stamped with the app they came from; the
  // framework takes commits from several apps, so the slug has to be in the
  // key. Echoes are anything the framework already pushed to this app.
  trailerKey: trailerKeyFor(appSlug),
  echoTrailerKeys: [trailerKeyFor('startup')],

  frameworkPrefixes: FRAMEWORK_PREFIXES,
  frameworkFiles: FRAMEWORK_FILES,
  // Framework schema scripts ride along with the framework change they belong
  // to, but never anchor a commit on their own — a schema script with no
  // framework change behind it doesn't mean anything in the framework repo.
  ridealongPrefixes: ['db-scripts/startup/'],
  ridealongLabel: 'db script',
  neverPick: NEVER_PICK,
  neverPickReason: NEVER_PICK_REASON,

  conflictPolicy: 'source-wins',
  tailUpApp: true,
  checkName: 'sync-conflicts',
  botName: BOT_NAME,
  botEmail: BOT_EMAIL,
});
