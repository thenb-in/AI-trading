#!/usr/bin/env node
//
// sync-framework.js — framework repo (`thenb-in/startup`) -> app repo.
//
// The mirror of sync-startup.js, and the direction that has to reconcile.
// Run BY an app repo (see .github/workflows/sync-framework.yml), which pulls
// from the framework: every write is local to the app repo, so the run needs
// only read access to the framework and no cross-repo write token.
//
// Rules — see scripts/lib/sync/paths.js for the path sets and why:
//   * A commit must touch at least one FRAMEWORK path to cross at all.
//   * FRAMEWORK and framework DB-SCRIPT changes on such a commit are applied.
//   * APP changes are applied only when the app repo already has the file.
//   * Commits the framework received FROM this app are skipped — without that
//     guard every app commit would round-trip back and conflict with itself.
//
// Conflict policy: `merge-then-park`. The app is live, functional code that
// diverges from the framework on purpose, so divergence here is normal and
// must not be silently overwritten:
//   * Non-overlapping edits three-way merge and just work.
//   * Overlapping edits put the framework version in the tree (so the branch
//     stays buildable and the test run means something) and park the app's
//     losing content, with the full diff3, under sync-conflicts/.
//   * scripts/check-sync-conflicts.js fails while anything is parked, so the
//     PR cannot merge until a human or agent reconciles it.
// See scripts/lib/sync/merge.js for why the framework wins in the tree.
//
// Usage:
//   node scripts/sync-framework.js \
//     --source-repo=../startup --target-repo=. \
//     [--target-branch=sync/from-startup] [--log-dir=…]
//

const { run } = require('./lib/sync/engine');
const { trailerKeyFor, repoSlug } = require('./lib/sync/label');
const {
  FRAMEWORK_PREFIXES,
  FRAMEWORK_FILES,
  NEVER_PICK,
  NEVER_PICK_REASON,
  BOT_NAME,
  BOT_EMAIL,
} = require('./lib/sync/paths');

const { parseArgs } = require('./lib/sync/engine');

const args = parseArgs(process.argv);
const appSlug = repoSlug(args['target-repo'] || '.', 'app');

run({
  key: 'sync-framework',
  title: `startup → ${appSlug}`,
  sourceLabel: 'startup',
  targetLabel: appSlug,
  sourceBranch: 'main',
  defaultBranchName: 'sync/from-startup',

  trailerKey: trailerKeyFor('startup'),
  echoTrailerKeys: [trailerKeyFor(appSlug)],

  frameworkPrefixes: FRAMEWORK_PREFIXES,
  frameworkFiles: FRAMEWORK_FILES,
  // Only framework schema scripts come back. The framework repo has no
  // business shipping an app's own migrations into it.
  ridealongPrefixes: ['db-scripts/startup/'],
  ridealongLabel: 'db script',
  neverPick: NEVER_PICK,
  neverPickReason: NEVER_PICK_REASON,

  conflictPolicy: 'merge-then-park',
  // No tail-up this way. Tail-up exists to catch app files that later source
  // commits fixed outside a framework commit; the framework repo's copy of an
  // app file is a synced artefact, not a source of truth, so refreshing from
  // it would overwrite the app's own later work.
  tailUpApp: false,
  checkName: 'sync-conflicts',
  botName: BOT_NAME,
  botEmail: BOT_EMAIL,
});
