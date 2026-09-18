//
// finalize.js — the commits a run lands of its own accord, after every source
// commit has been replayed: the app tail-up and the conflict reconciliation.
//

const fs = require('fs');
const path = require('path');

const { git, gitTry } = require('./git');
const { targetHasFile } = require('./rules');
const { readSourceBlob } = require('./apply');
const { writeFileEnsuringDir, writeReport, CONFLICT_DIR } = require('./merge');

function commitAsBot(targetRepo, direction, message) {
  git(
    targetRepo,
    [
      '-c', `user.name=${direction.botName}`,
      '-c', `user.email=${direction.botEmail}`,
      'commit', '--no-verify', '-m', message,
    ],
    { env: { ...process.env, HUSKY: '0' } }
  );
  return git(targetRepo, ['rev-parse', 'HEAD']).trim();
}

// App files picked mid-run may have been edited again by later source commits
// that were skipped here for touching no framework path — often a follow-up
// fix to the very file an earlier commit wrote. Without catching up, the
// target ends on a stale intermediate. Refresh every app file we touched to
// the source's tip and land it as one trailing commit.
function tailUpAppFiles(sourceRepo, targetRepo, sourceBranch, toSha, results, direction) {
  // Only files this run applied CLEANLY. For those the target holds exactly
  // the source's blob at that commit, so fast-forwarding them to the tip is
  // safe. A file that merged or conflicted holds a reconciled result that is
  // worth more than the tip blob — blindly overwriting it here would redo the
  // very silent clobbering that apply.js exists to prevent.
  const touched = new Set();
  const preserved = [];
  for (const c of results.commits) {
    if (c.error || !c.app) continue;
    for (const f of c.app.picks) {
      if (f.classification === 'clean') touched.add(f.path);
      else preserved.push(f.path);
    }
  }
  for (const p of preserved) touched.delete(p);
  const tailup = { refreshed: [], deleted: [], unchanged: 0, skipped: 0 };
  for (const p of touched) {
    // The file may have been deleted in the target by a later applied commit.
    if (!targetHasFile(targetRepo, p)) { tailup.skipped++; continue; }
    // Distinguish "the path is genuinely gone at source HEAD" from any other
    // git failure. Treating every error as a deletion means a transient fault
    // removes a live file.
    const exists = gitTry(sourceRepo, ['cat-file', '-e', `${sourceBranch}:${p}`]).ok;
    if (!exists) {
      git(targetRepo, ['rm', '-f', '--', p]);
      tailup.deleted.push(p);
      continue;
    }
    const headBlob = readSourceBlob(sourceRepo, sourceBranch, p);
    const targetBlob = fs.readFileSync(path.join(targetRepo, p));
    if (headBlob.equals(targetBlob)) { tailup.unchanged++; continue; }
    writeFileEnsuringDir(path.join(targetRepo, p), headBlob);
    git(targetRepo, ['add', '-f', '--', p]);
    tailup.refreshed.push(p);
  }
  if (tailup.refreshed.length || tailup.deleted.length) {
    tailup.commitSha = commitAsBot(
      targetRepo,
      direction,
      'chore(sync): refresh app files to source HEAD\n\n' +
      'Catches up files that were updated by source commits which were\n' +
      'skipped during this run because they touched only non-framework\n' +
      'paths. See per-commit log for the full list.\n\n' +
      `${direction.trailerKey}-tail-up: ${toSha}\n`
    );
  }
  tailup.preserved = preserved;
  return tailup;
}

function landConflictReport(targetRepo, conflicts, resolved, direction, toSha) {
  writeReport(targetRepo, conflicts, resolved, {
    sourceLabel: direction.sourceLabel,
    targetLabel: direction.targetLabel,
    checkName: direction.checkName,
  });
  const subject = conflicts.length
    ? `chore(sync): park ${conflicts.length} unresolved conflict(s)`
    : `chore(sync): reconcile ${resolved.length} conflict(s) against source tip`;
  const body = conflicts.length
    ? 'Files that could not be merged automatically, even against the source\n' +
      `tip. The tree holds the ${direction.sourceLabel} version of each; what\n` +
      `${direction.targetLabel} had is preserved under ${CONFLICT_DIR}/. This PR is\n` +
      `blocked until that directory is empty — see ${CONFLICT_DIR}/REPORT.md.\n`
    : 'Files that conflicted against an intermediate commit but merge cleanly\n' +
      'against the source tip. Resolved automatically; no action needed.\n';
  return commitAsBot(
    targetRepo,
    direction,
    `${subject}\n\n${body}\n${direction.trailerKey}-conflicts: ${toSha}\n`
  );
}

module.exports = { commitAsBot, tailUpAppFiles, landConflictReport };
