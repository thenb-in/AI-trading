//
// rules.js — path classification and commit walking, parameterised by the
// direction config (see scripts/sync-startup.js and scripts/sync-framework.js).
//
// Buckets, in precedence order:
//   excluded  — matched neverPick, dropped no matter what.
//   framework — always applied, and anchors the commit (a commit with none
//               of these is skipped entirely).
//   ridealong — always applied, but never anchors a commit on its own.
//   app       — applied per the direction's appPolicy.
//

const fs = require('fs');
const path = require('path');

const { git } = require('./git');

function listCommitsToSync(sourceRepo, fromSha, toRef) {
  // `--reverse` so we apply in chronological order; `--no-merges` because
  // merge commits aren't real new work — their content was already
  // contributed by their non-merge parents.
  const range = fromSha ? `${fromSha}..${toRef}` : toRef;
  const out = git(sourceRepo, [
    'log',
    range,
    '--no-merges',
    '--reverse',
    '--pretty=format:%H',
  ]);
  return out.split('\n').filter(Boolean);
}

// A commit whose message carries one of the direction's echo trailers came
// from the other side of the loop in an earlier run. Replaying it would push
// the same change back where it originated, duplicating it and guaranteeing
// a conflict against itself on every subsequent run.
function isEchoCommit(sourceRepo, sha, echoTrailerKeys) {
  if (!echoTrailerKeys || echoTrailerKeys.length === 0) return null;
  const body = git(sourceRepo, ['show', '-s', '--format=%B', sha]);
  for (const key of echoTrailerKeys) {
    const m = body.match(new RegExp(`^${key}(?:-[\\w-]+)?:\\s*(\\S+)`, 'm'));
    if (m) return { key, sha: m[1] };
  }
  return null;
}

function getCommitFiles(sourceRepo, sha) {
  // Rename detection ON (`-M`). Without it, a rename would split into
  // delete-old + add-new and the "don't create new non-framework files"
  // rule would silently drop the new side — leaving callers of the
  // renamed file (e.g. lint rule indexes) pointing at a missing path.
  // For renames we emit a single item with both paths and let the
  // applier do an atomic move.
  // `-M20` lowers the rename-similarity threshold from git's default 50%
  // to 20%. We routinely see rename-with-significant-rewrite (e.g.
  // 60->140 line rule file that the diff-line count tips below 50% but
  // the basename and intent make obviously the same file) and 20% still
  // requires substantial content overlap, so false positives are rare.
  const out = git(sourceRepo, ['show', '-M20', '--name-status', '--format=', sha]);
  const items = [];
  for (const line of out.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('\t');
    const status = parts[0][0];
    if (status === 'R' || status === 'C') {
      // R100\toldpath\tnewpath   /   C90\tsrc\tdst
      items.push({ status, oldPath: parts[1], path: parts[2] });
    } else {
      items.push({ status, path: parts[1] });
    }
  }
  return items.filter((f) => f.path);
}

function matchesPrefix(p, prefixes) {
  return prefixes.some((pfx) => p === pfx.slice(0, -1) || p.startsWith(pfx));
}

function classifyPath(p, direction) {
  if (direction.neverPick.some((re) => re.test(p))) return 'excluded';
  if (matchesPrefix(p, direction.frameworkPrefixes)) return 'framework';
  // Individual framework files that don't live under a framework folder —
  // the sync tooling itself, which has to be able to propagate to a repo
  // that doesn't have it yet (app paths are only picked if already present).
  if (direction.frameworkFiles.some((re) => re.test(p))) return 'framework';
  if (matchesPrefix(p, direction.ridealongPrefixes)) return 'ridealong';
  return 'app';
}

function targetHasFile(targetRepo, p) {
  return fs.existsSync(path.join(targetRepo, p));
}

module.exports = {
  listCommitsToSync,
  isEchoCommit,
  getCommitFiles,
  matchesPrefix,
  classifyPath,
  targetHasFile,
};
