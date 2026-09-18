//
// branch.js — the standing sync branch and the resume watermark.
//
// Why a standing branch instead of a fresh one per night:
//
//   A throwaway branch plus an external "last synced SHA" tag is only safe
//   when every PR merges the same day. The moment one sits open, the next
//   night cuts a new branch off the base — which does NOT contain last
//   night's commits — and replays from an advanced watermark. That branch is
//   missing context, so it conflicts on files that had no conflict at all,
//   and it gets worse every night. Worse, any conflict a human resolved
//   inside the open PR is thrown away when its branch is superseded.
//
//   So: one long-lived branch per direction. If it already exists we append
//   to it, and human resolutions on it become the base every later commit
//   merges against — which is what stops one conflict cascading into many.
//
// Why the watermark is read from commit trailers rather than a tag:
//
//   Every replayed commit carries `<trailerKey>: <source sha>`. The newest
//   such trailer reachable from the branch head IS the resume point. If the
//   PR merged, those trailers are on the base branch; if it's still open,
//   they're on the sync branch. One query answers both, so there is no
//   external state that can drift out of step with what the repo actually
//   contains.
//
//   This is why these PRs must be merged with a merge commit, never squashed
//   — a squash collapses the per-commit history AND eats every trailer but
//   one, so the next run would re-replay work that is already in.
//

const { git, gitTry } = require('./git');
const { escapeRegex } = require('./rules');

// `--exit-code` makes git exit 2 for "no such ref". Anything else — an expired
// token, a network blip, rate limiting — must NOT be read as "branch absent":
// that would re-cut the standing branch from the base, discarding every
// unmerged sync commit and every human conflict resolution on it.
function remoteBranchExists(repo, branch) {
  const r = gitTry(repo, ['ls-remote', '--exit-code', '--heads', 'origin', branch]);
  if (r.ok) return Boolean(r.out.trim());
  if (r.err && r.err.status === 2) return false;
  const detail = String((r.err && r.err.stderr && r.err.stderr.toString()) || r.err);
  throw new Error(
    `could not determine whether origin/${branch} exists (git exited ` +
    `${r.err && r.err.status}): ${detail.trim()}\n` +
    '  Refusing to continue: treating this as "branch absent" would discard ' +
    'the standing branch.'
  );
}

// Puts the target on the sync branch, either freshly cut from the base or
// resumed from the remote. When resuming, merge the base in so the PR stays
// mergeable; a conflict there is an ordinary PR conflict, so we abort and let
// GitHub surface it rather than inventing a resolution.
function prepareBranch(targetRepo, { targetBranch, targetBaseBranch, direction }) {
  git(targetRepo, ['fetch', 'origin', targetBaseBranch]);

  if (!remoteBranchExists(targetRepo, targetBranch)) {
    git(targetRepo, ['checkout', '-B', targetBranch, `origin/${targetBaseBranch}`]);
    return { mode: 'created', baseMergeConflict: false };
  }

  git(targetRepo, ['fetch', 'origin', targetBranch]);
  git(targetRepo, ['checkout', '-B', targetBranch, `origin/${targetBranch}`]);

  const behind = gitTry(targetRepo, [
    'rev-list', '--count', `HEAD..origin/${targetBaseBranch}`,
  ]);
  if (behind.ok && behind.out.trim() === '0') {
    return { mode: 'resumed', baseMergeConflict: false };
  }

  const merge = gitTry(targetRepo, [
    '-c', `user.name=${direction.botName}`,
    '-c', `user.email=${direction.botEmail}`,
    'merge', '--no-edit', '--no-verify', `origin/${targetBaseBranch}`,
  ]);
  if (merge.ok) return { mode: 'resumed', baseMergeConflict: false };

  gitTry(targetRepo, ['merge', '--abort']);
  return { mode: 'resumed', baseMergeConflict: true };
}

// The resume point: newest `<trailerKey>: <sha>` reachable from the branch.
// Matches the bare trailer only — the `-tail-up` / `-conflicts` variants
// carry the range head, not the last applied commit, and resuming from those
// would step over commits that were never applied.
//
// Scans several candidates rather than just the newest, and keeps going when
// one doesn't parse or doesn't resolve in the source. A single unusable
// trailer — a human writing `Synced-from-startup: see #412`, or a commit the
// source force-pushed away — must not cost us the real resume point.
//
// Returns { sha, sawCandidates }. `sawCandidates` with a null `sha` means the
// branch DOES claim to have synced but we can't tell from where: the caller
// must treat that as fatal, never as a bootstrap.
const WATERMARK_SCAN_DEPTH = 50;

function readWatermark(targetRepo, ref, trailerKey, resolvesInSource) {
  const r = gitTry(targetRepo, [
    'log', ref, '--grep', `^${escapeRegex(trailerKey)}: `,
    '-n', String(WATERMARK_SCAN_DEPTH), '--format=%B%x00',
  ]);
  if (!r.ok) return { sha: null, sawCandidates: false };

  const bodies = r.out.split('\0').filter((b) => b.trim());
  const re = new RegExp(`^${escapeRegex(trailerKey)}:\\s*([0-9a-f]{7,40})\\s*$`, 'm');
  let sawCandidates = false;
  for (const body of bodies) {
    sawCandidates = true;
    const m = body.match(re);
    if (!m) continue;
    if (!resolvesInSource || resolvesInSource(m[1])) return { sha: m[1], sawCandidates };
  }
  return { sha: null, sawCandidates };
}

module.exports = { prepareBranch, readWatermark, remoteBranchExists };
