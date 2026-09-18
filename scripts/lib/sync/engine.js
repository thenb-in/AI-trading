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
const { reconcileParkedConflicts, listStaleParks, CONFLICT_DIR } = require('./merge');
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

// Short COMMITTER date, for the PR title/body. Answers "how current does this
// PR bring me?", which the GitHub PR list does not show — it shows when the PR
// was opened, and on a long-lived sync branch those drift apart.
//
// Committer date, not author date: an imported, cherry-picked or backdated
// commit can carry an author date years old, which would make the range read
// as going backwards. What a reviewer wants is when the work landed.
function commitDate(repo, sha) {
  const r = gitTry(repo, ['log', '-1', '--format=%cd', '--date=short', sha]);
  return r.ok ? r.out.trim() : '';
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
    `from_date=${results.fromDate || ''}`,
    `to_date=${results.toDate || ''}`,
    `pending_commits=${results.pendingCommits}`,
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
  // An explicit override wins outright. It is the only manual recovery lever
  // when the trailers are damaged, so it must not be quietly ignored on a
  // branch that has synced before.
  if (args['start-from']) {
    if (!resolvesInSource(sourceRepo, args['start-from'])) {
      fail(`--start-from=${args['start-from']} does not resolve in the source repo`);
    }
    log(`using --start-from=${args['start-from']} (overrides the branch watermark)`);
    return args['start-from'];
  }

  const { sha, sawCandidates } = readWatermark(
    targetRepo, 'HEAD', direction.trailerKey, (c) => resolvesInSource(sourceRepo, c)
  );
  if (sha) {
    log(`resuming at ${sha} (newest usable ${direction.trailerKey} trailer on the branch)`);
    return sha;
  }

  // The branch says it has synced before, but no trailer we can act on. The
  // 24h anchor below would silently skip everything between the real resume
  // point and yesterday — a green run, a plausible-looking PR, and weeks of
  // work never replayed. Refuse instead and make a human choose the range.
  if (sawCandidates) {
    fail(
      `found ${direction.trailerKey} trailer(s) on ${direction.targetLabel}, but none names a ` +
      'commit this source repo can resolve.\n' +
      '  That usually means the source branch was force-pushed or rebased, the clone is ' +
      'shallow, or a sync PR was squash-merged (which destroys the trailers).\n' +
      '  Refusing to guess a range — re-run with --start-from=<sha> to say where to resume.'
    );
  }

  const anchor = gitTry(sourceRepo, [
    'rev-list', '-n', '1', '--before=24 hours ago', direction.sourceBranch,
  ]);
  if (anchor.ok && anchor.out.trim()) {
    log(`bootstrap run (no prior sync on this branch): anchoring at ${anchor.out.trim()} (24h ago)`);
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

  const halted = results.commits.some((c) => c.error);

  // Tail-up pulls app files forward to the SOURCE TIP. After a halt that is
  // actively harmful: the un-applied commits were rolled back and will be
  // replayed next run, but their parent blobs would no longer match the
  // target, so every one of them would merge against content that already
  // contains its own change. Spurious conflicts and duplicated hunks on a
  // path the design treats as "just re-run".
  if (halted) {
    log('skipping tail-up: run halted on an error, so the tree is not at the source tip');
  }
  if (direction.tailUpApp && !halted) {
    results.tailup = tailUpAppFiles(sourceRepo, targetRepo, sourceBranch, toSha, results, direction);
    log(
      `tail-up: refreshed=${results.tailup.refreshed.length} ` +
      `deleted=${results.tailup.deleted.length} unchanged=${results.tailup.unchanged} ` +
      `skipped=${results.tailup.skipped}`
    );
  }

  // Conflicts parked by earlier runs still block the check, so they have to be
  // carried into this run's report — otherwise the gate stays red while the
  // document explaining how to clear it gets deleted.
  const stale = listStaleParks(targetRepo, new Set(results.conflicts.map((c) => c.path)));
  if (stale.length) {
    results.staleConflicts = stale.map((c) => c.path);
    results.conflicts.push(...stale);
    log(`${stale.length} conflict(s) still parked from an earlier run`);
  }

  if (results.conflicts.length) {
    // `-f`: .vscode/ is a framework prefix and is gitignored in plenty of
    // repos, and `git add -A` without it exits 1 on an ignored path.
    const stage = (p) => git(targetRepo, ['add', '-A', '-f', '--', p]);
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
  results.fromDate = fromSha ? commitDate(sourceRepo, fromSha) : '';
  results.toDate = commitDate(sourceRepo, toSha);
  // Everything sitting on the branch, not just this run's batch — a standing
  // branch accumulates across nights, so the per-run count understates it.
  const pending = gitTry(targetRepo, [
    'rev-list', '--count', `origin/${targetBaseBranch}..HEAD`,
  ]);
  results.pendingCommits = pending.ok ? Number(pending.out.trim()) : 0;

  const text = writeLogs(results, logDir, direction);
  writeGithubOutputs(results, direction, targetBranch);

  console.log('\n' + text.split('\n').slice(0, 60).join('\n'));
  if (summarize(results).failed > 0) process.exit(2);
}

module.exports = { run, parseArgs };
