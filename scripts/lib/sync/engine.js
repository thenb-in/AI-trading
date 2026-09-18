//
// engine.js — the shared sync run: resume the standing branch, replay every
// qualifying source commit onto it, tail up, park conflicts, write logs.
//
// Both directions share this; they differ only in the direction config they
// hand to `run()` (see scripts/sync-startup.js and scripts/sync-framework.js).
//
// The run is a PULL: it is executed by the repo that receives the commits, so
// every write is local and only the source needs to be readable.
//

const fs = require('fs');
const path = require('path');

const { git, gitTry, remoteIdentity } = require('./git');
const { listCommitsToSync } = require('./rules');
const { reconcileParkedConflicts, CONFLICT_DIR } = require('./merge');
const { tailUpAppFiles, landConflictReport } = require('./finalize');
const { prepareBranch, readWatermark } = require('./branch');
const { syncCommit } = require('./commit');
const { summarize, writeLogs } = require('./report');

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    args[m[1]] = m[2] === undefined ? true : m[2];
  }
  return args;
}

// A repo must never sync into itself. The workflows live in framework paths,
// so every app repo AND the framework repo carry both of them; without this
// guard the framework would replay its own commits onto a branch of itself
// and open nightly noise PRs. Compares the remote each checkout pushes to,
// and the checkout paths themselves.
function sameRepo(sourceRepo, targetRepo) {
  if (path.resolve(sourceRepo) === path.resolve(targetRepo)) {
    return { same: true, how: `both are the checkout at ${path.resolve(sourceRepo)}` };
  }
  const sourceId = remoteIdentity(sourceRepo);
  const targetId = remoteIdentity(targetRepo);
  if (sourceId && targetId && sourceId === targetId) {
    return { same: true, how: `both point at '${targetId}'` };
  }
  return { same: false };
}

function writeGithubOutputs(results, direction, targetBranch) {
  const gho = process.env.GITHUB_OUTPUT;
  if (!gho) return;
  const sum = summarize(results);
  const lines = [
    `commits_examined=${sum.totalCommits}`,
    `commits_applied=${sum.applied}`,
    `commits_failed=${sum.failed}`,
    `commits_skipped=${sum.skipped}`,
    `conflicts=${sum.conflicts}`,
    `has_conflicts=${sum.conflicts > 0 ? 'true' : 'false'}`,
    `base_merge_conflict=${results.branch.baseMergeConflict ? 'true' : 'false'}`,
    `branch_mode=${results.branch.mode}`,
    `target_branch=${targetBranch}`,
    `from_sha=${results.fromSha || ''}`,
    `to_sha=${results.toSha}`,
    `has_changes=${sum.applied > 0 ? 'true' : 'false'}`,
  ];
  fs.appendFileSync(gho, lines.join('\n') + '\n');
}

// A resume point is only usable if the source actually still has that commit.
// Trailers can name a SHA the source can't resolve — a force-pushed or
// rebased source branch, a shallow clone, or a trailer someone wrote by hand.
// Trusting one blindly kills the run with a raw git stack trace; falling back
// costs at worst a re-examined range, which is idempotent.
function resolvesInSource(sourceRepo, sha) {
  return gitTry(sourceRepo, ['cat-file', '-e', `${sha}^{commit}`]).ok;
}

function resolveRange(sourceRepo, targetRepo, direction, args, log, fail) {
  // Resume point, in order of trust: the newest provenance trailer already on
  // the branch (the repo's own record of what it has), then an explicit
  // override, then a 24h anchor so a first run doesn't replay all history.
  const watermark = readWatermark(targetRepo, 'HEAD', direction.trailerKey);
  if (watermark && resolvesInSource(sourceRepo, watermark)) {
    log(`resuming at ${watermark} (newest ${direction.trailerKey} trailer on the branch)`);
    return watermark;
  }
  if (watermark) {
    log(
      `WARNING: newest ${direction.trailerKey} trailer names ${watermark}, which does not ` +
      'resolve in the source repo — ignoring it and falling back.'
    );
  }
  if (args['start-from']) {
    if (!resolvesInSource(sourceRepo, args['start-from'])) {
      fail(`--start-from=${args['start-from']} does not resolve in the source repo`);
    }
    log(`no usable provenance trailer; using --start-from=${args['start-from']}`);
    return args['start-from'];
  }
  const anchor = gitTry(sourceRepo, [
    'rev-list', '-n', '1', '--before=24 hours ago', direction.sourceBranch,
  ]);
  if (anchor.ok && anchor.out.trim()) {
    log(`bootstrap run: anchoring at ${anchor.out.trim()} (24h ago)`);
    return anchor.out.trim();
  }
  return null;
}

function run(direction) {
  const log = (m) => console.log(`[${direction.key}] ${m}`);
  const fail = (msg) => {
    console.error(`[${direction.key}] ${msg}`);
    process.exit(1);
  };

  const args = parseArgs(process.argv);
  const sourceRepo = path.resolve(args['source-repo'] || '.');
  if (!args['target-repo']) fail('missing --target-repo=<path>');
  const targetRepo = path.resolve(args['target-repo']);
  const sourceBranch = args['source-branch'] || direction.sourceBranch || 'main';
  const targetBranch = args['target-branch'] || direction.defaultBranchName;
  const targetBaseBranch = args['target-base-branch'] || 'main';
  const logDir = path.resolve(args['log-dir'] || 'sync-logs');

  for (const [label, repo] of [['source', sourceRepo], ['target', targetRepo]]) {
    if (!fs.existsSync(path.join(repo, '.git'))) {
      fail(`${label} repo is not a git checkout: ${repo}`);
    }
  }

  const same = sameRepo(sourceRepo, targetRepo);
  if (same.same) {
    // Not an error: this direction simply doesn't apply to the repo it's
    // running in. Exit 0 so the workflow reports a clean no-op rather than a
    // nightly red run in the framework repo.
    log(`source and target are the same repo (${same.how}) — nothing to sync, exiting`);
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'skipped_same_repo=true\nhas_changes=false\n');
    }
    return;
  }

  const branch = prepareBranch(targetRepo, { targetBranch, targetBaseBranch, direction });
  log(`branch ${targetBranch}: ${branch.mode}`);
  if (branch.baseMergeConflict) {
    log(
      `WARNING: could not merge origin/${targetBaseBranch} into ${targetBranch} cleanly. ` +
      'Appending anyway; GitHub will show the PR as conflicted for manual resolution.'
    );
  }

  const fromSha = resolveRange(
    sourceRepo, targetRepo, { ...direction, sourceBranch }, args, log, fail
  );
  const toSha = git(sourceRepo, ['rev-parse', sourceBranch]).trim();
  const commits = listCommitsToSync(sourceRepo, fromSha, sourceBranch);
  log(`${commits.length} commit(s) to examine (${fromSha || '(bootstrap)'} .. ${toSha})`);

  const results = {
    startedAt: new Date().toISOString(),
    direction: direction.key,
    sourceRepo,
    targetRepo,
    sourceBranch,
    targetBranch,
    targetBaseBranch,
    branch,
    fromSha,
    toSha,
    commits: [],
    conflicts: [],
  };
  // Buffers for the end-of-run reconciliation; deliberately kept off
  // `results` so they don't end up in the JSON log.
  const state = { conflicts: results.conflicts, conflictBlobs: new Map() };

  for (const sha of commits) {
    const r = syncCommit(sourceRepo, targetRepo, sha, direction, state);
    results.commits.push(r);
    const tag = r.error ? 'FAIL' : r.skipped ? 'skip' : 'OK  ';
    console.log(`  [${tag}] ${sha.slice(0, 12)}  ${r.subject}`);
    if (r.error) {
      // Halt on first error: a failed apply usually means the rules need a
      // tweak, and continuing would compound the mess. The log already
      // captured what we did and where we stopped. The watermark is read from
      // the branch, so the next run resumes exactly here with no state to fix.
      console.error(`[${direction.key}] halting after error on ${sha}`);
      break;
    }
  }

  if (direction.tailUpApp) {
    results.tailup = tailUpAppFiles(sourceRepo, targetRepo, sourceBranch, toSha, results, direction);
    log(
      `tail-up: refreshed=${results.tailup.refreshed.length} ` +
      `deleted=${results.tailup.deleted.length} unchanged=${results.tailup.unchanged} ` +
      `skipped=${results.tailup.skipped}`
    );
  }

  if (results.conflicts.length) {
    const stage = (p) => git(targetRepo, ['add', '-A', '--', p]);
    const { remaining, resolved } = reconcileParkedConflicts(
      targetRepo, results.conflicts, state.conflictBlobs, direction, stage
    );
    results.autoResolved = resolved;
    results.conflicts = remaining;
    if (resolved.length) {
      log(`${resolved.length} conflict(s) resolved by re-merging against the source tip`);
    }
    results.conflictCommitSha = landConflictReport(
      targetRepo, results.conflicts, resolved, direction, toSha
    );
    if (remaining.length) {
      log(`${remaining.length} unresolved conflict(s) parked under ${CONFLICT_DIR}/`);
    }
  }

  results.finishedAt = new Date().toISOString();
  const text = writeLogs(results, logDir, direction);
  writeGithubOutputs(results, direction, targetBranch);

  console.log('\n' + text.split('\n').slice(0, 60).join('\n'));
  if (summarize(results).failed > 0) process.exit(2);
}

module.exports = { run, parseArgs };
