//
// commit.js — replays one source commit onto the target branch.
//

const { git, gitTry } = require('./git');
const { getCommitFiles, classifyPath, targetHasFile, isEchoCommit } = require('./rules');
const { applyFile } = require('./apply');

const PICK_BUCKETS = {
  clean: 'cleanPicks',
  force: 'forcePicks',
  merged: 'mergedPicks',
  conflict: 'conflictPicks',
};

function emptyPickSet() {
  return { total: 0, cleanPicks: [], forcePicks: [], mergedPicks: [], conflictPicks: [] };
}

function fileRef(f) {
  return { path: f.path, oldPath: f.oldPath, status: f.status };
}

function nonPickReason(f) {
  if (f.status === 'D') return 'file already absent in target';
  if (f.status === 'R' || f.status === 'C') {
    return `rename/copy source absent in target (${f.oldPath})`;
  }
  return 'file does not exist in target';
}

function syncCommit(sourceRepo, targetRepo, sha, direction, state) {
  const meta = git(sourceRepo, [
    'show', '-s',
    '--format=%H%x00%an%x00%ae%x00%aI%x00%s%x00%B',
    sha,
  ]).split('\x00');
  const [, an, ae, aIso, subject, body] = meta;

  const result = {
    sha,
    subject,
    author: `${an} <${ae}>`,
    date: aIso,
    framework: emptyPickSet(),
    ridealong: emptyPickSet(),
    app: { total: 0, picks: [], nonPicks: [] },
    excluded: { total: 0, files: [] },
    targetSha: null,
    skipped: false,
    skipReason: null,
    error: null,
  };

  // Echo guard: a commit that this sync already pushed in the other
  // direction must not be replayed back where it came from.
  const echo = isEchoCommit(sourceRepo, sha, direction.echoTrailerKeys);
  if (echo) {
    result.skipped = true;
    result.skipReason = `echo of ${echo.key}: ${echo.sha.slice(0, 12)} (originated in the target repo)`;
    return result;
  }

  const files = getCommitFiles(sourceRepo, sha);
  // Bucket each file by path. For rename/copy entries the path used for
  // classification is the NEW path, since that's where the file ends up.
  const buckets = { framework: [], ridealong: [], app: [], excluded: [] };
  for (const f of files) buckets[classifyPath(f.path, direction)].push(f);

  if (buckets.framework.length === 0) {
    // Commit-level skip: nothing to anchor the commit on the framework side.
    // We don't try to apply ridealong, app or excluded edits in this case —
    // without a framework change the commit doesn't belong in the target.
    result.skipped = true;
    result.skipReason =
      `no framework file changes (${direction.ridealongLabel}: ${buckets.ridealong.length}, ` +
      `app: ${buckets.app.length}, excluded: ${buckets.excluded.length} ignored)`;
    return result;
  }

  result.framework.total = buckets.framework.length;
  result.ridealong.total = buckets.ridealong.length;
  result.app.total = buckets.app.length;
  result.excluded.total = buckets.excluded.length;
  for (const f of buckets.excluded) {
    result.excluded.files.push({ ...fileRef(f), reason: direction.neverPickReason });
  }

  const ctx = {
    sourceRepo,
    targetRepo,
    sha,
    direction,
    conflicts: state.conflicts,
    conflictBlobs: state.conflictBlobs,
  };

  try {
    for (const bucket of ['framework', 'ridealong']) {
      for (const f of buckets[bucket]) {
        const cls = applyFile(ctx, f);
        result[bucket][PICK_BUCKETS[cls]].push(fileRef(f));
      }
    }

    for (const f of buckets.app) {
      // "Don't create new app files" applies to brand-new paths, not to a
      // renamed existing file — a rename is pickable when the OLD path
      // exists in the target, because we're moving content, not creating it.
      const checkPath = f.status === 'R' || f.status === 'C' ? f.oldPath : f.path;
      if (!targetHasFile(targetRepo, checkPath)) {
        result.app.nonPicks.push({ ...fileRef(f), reason: nonPickReason(f) });
        continue;
      }
      const cls = applyFile(ctx, f);
      result.app.picks.push({ ...fileRef(f), classification: cls });
    }

    const staged = git(targetRepo, ['diff', '--cached', '--name-only']).trim();
    if (!staged) {
      // Everything got filtered (e.g. only deletions of files already absent
      // in the target). Don't create an empty commit; still log it.
      result.skipped = true;
      result.skipReason = 'all changes filtered out after target-existence check';
      return result;
    }

    // Preserve the original author + date so blame stays meaningful in the
    // target repo. Committer is the sync bot.
    const message = `${body.trimEnd()}\n\n${direction.trailerKey}: ${sha}\n`;
    git(
      targetRepo,
      [
        '-c', `user.name=${direction.botName}`,
        '-c', `user.email=${direction.botEmail}`,
        'commit',
        '--no-verify',
        `--author=${an} <${ae}>`,
        `--date=${aIso}`,
        '-F', '-',
      ],
      { input: message, env: { ...process.env, HUSKY: '0' } }
    );
    result.targetSha = git(targetRepo, ['rev-parse', 'HEAD']).trim();
  } catch (e) {
    // Roll back any half-applied state so the next commit starts clean and
    // the worktree is sane for debugging.
    gitTry(targetRepo, ['reset', '--hard']);
    gitTry(targetRepo, ['clean', '-fd']);
    result.error = String((e && e.stderr && e.stderr.toString()) || e.message || e);
  }

  return result;
}

module.exports = { syncCommit };
