//
// apply.js — per-file application, for both conflict policies.
//
// Classifications returned:
//   clean    — target matched the source's pre-image (or didn't have the
//              file); applying was a straight fast-forward.
//   force    — `source-wins` policy only: target had divergent content and we
//              overwrote it.
//   merged   — `merge-then-park` policy: target had divergent content but the
//              edits didn't overlap, so a three-way merge resolved it.
//   conflict — `merge-then-park` policy: genuinely overlapping edits. Source
//              wins in the tree, target's losing content is parked under
//              sync-conflicts/ (see merge.js for why round this way).
//

const fs = require('fs');
const path = require('path');

const { git, gitBuf } = require('./git');
const { isBinary, writeFileEnsuringDir, mergeThreeWay, parkConflict } = require('./merge');

function readSourceBlob(sourceRepo, sha, p) {
  return gitBuf(sourceRepo, ['show', `${sha}:${p}`]);
}

function readParentBlob(sourceRepo, sha, p) {
  try {
    return gitBuf(sourceRepo, ['show', `${sha}^:${p}`]);
  } catch (e) {
    return null;
  }
}

// Resolve a divergence for the `merge-then-park` policy. Always writes the
// winning content to `absPath` and stages `filePath`; records a conflict on
// the context when the merge couldn't be resolved.
function resolveDivergence(ctx, { filePath, absPath, base, ours, theirs, kind }) {
  const { targetRepo, sha, direction } = ctx;

  // Keep the FIRST base/ours we see for a path. That pair is the target's
  // true pre-sync state, which is what the end-of-run reconciliation has to
  // merge against — later commits would give us a base already polluted by
  // this run's own writes.
  if (!ctx.conflictBlobs.has(filePath)) {
    ctx.conflictBlobs.set(filePath, { base, ours });
  }

  if (isBinary(ours) || isBinary(theirs)) {
    writeFileEnsuringDir(absPath, theirs);
    git(targetRepo, ['add', '-f', '--', filePath]);
    const parkedAs = parkConflict(targetRepo, {
      filePath,
      header: [
        `Binary file diverged; cannot three-way merge (${kind}).`,
        `Source commit: ${sha}`,
        `The tree now holds the ${direction.sourceLabel} version.`,
        `Below is the ${direction.targetLabel} version that it replaced.`,
      ],
      content: ours || Buffer.alloc(0),
    });
    ctx.conflicts.push({ path: filePath, kind: `${kind} (binary)`, sha, parkedAs });
    return 'conflict';
  }

  const merged = mergeThreeWay({
    base,
    ours,
    theirs,
    oursLabel: `${direction.targetLabel} (this repo)`,
    theirsLabel: `${direction.sourceLabel} (incoming)`,
  });

  if (merged.clean) {
    writeFileEnsuringDir(absPath, merged.content);
    git(targetRepo, ['add', '-f', '--', filePath]);
    return 'merged';
  }

  // Overlapping edits. Source wins in the tree; the full diff3 is parked.
  writeFileEnsuringDir(absPath, theirs);
  git(targetRepo, ['add', '-f', '--', filePath]);
  const parkedAs = parkConflict(targetRepo, {
    filePath,
    header: [
      `Overlapping edits could not be merged automatically (${kind}).`,
      `Source commit: ${sha}`,
      `${filePath} in the tree now holds the ${direction.sourceLabel} version.`,
      'Below is the full three-way merge, markers and all.',
    ],
    content: merged.content,
  });
  ctx.conflicts.push({ path: filePath, kind, sha, parkedAs });
  return 'conflict';
}

function applyRename(ctx, file) {
  const { sourceRepo, targetRepo, sha, direction } = ctx;
  const newAbs = path.join(targetRepo, file.path);
  const oldAbs = file.oldPath ? path.join(targetRepo, file.oldPath) : null;
  // Clean if the target's content at the OLD path matched the source's
  // pre-image there — we're moving content that wasn't independently edited.
  const parent = readParentBlob(sourceRepo, sha, file.oldPath);
  const oldExists = Boolean(oldAbs) && fs.existsSync(oldAbs);
  const oldBlob = oldExists ? fs.readFileSync(oldAbs) : null;
  const divergent = !(parent && oldExists && parent.equals(oldBlob));
  const blob = readSourceBlob(sourceRepo, sha, file.path);

  if (file.status === 'R' && oldExists) {
    git(targetRepo, ['rm', '-f', '--', file.oldPath]);
  }

  if (!divergent || direction.conflictPolicy === 'source-wins') {
    writeFileEnsuringDir(newAbs, blob);
    git(targetRepo, ['add', '-f', '--', file.path]);
    return divergent ? 'force' : 'clean';
  }

  // Rename-plus-edit against a target that also edited the old path: merge
  // the target's old content into the source's new content.
  return resolveDivergence(ctx, {
    filePath: file.path,
    absPath: newAbs,
    base: parent,
    ours: oldBlob,
    theirs: blob,
    kind: `${file.status === 'R' ? 'rename' : 'copy'} from ${file.oldPath}`,
  });
}

function applyDelete(ctx, file, { parent, targetExists, targetBlob }) {
  const { targetRepo, sha, direction } = ctx;
  const divergent = !(parent && targetExists && parent.equals(targetBlob));

  if (targetExists) {
    git(targetRepo, ['rm', '-f', '--', file.path]);
  }
  // If the target didn't have it, the deletion is a silent no-op.
  if (!targetExists) return 'clean';
  if (!divergent) return 'clean';
  if (direction.conflictPolicy === 'source-wins') return 'force';

  // Source deleted a file the target had independently edited. The deletion
  // stands, but the target's version must not vanish unreviewed.
  const parkedAs = parkConflict(targetRepo, {
    filePath: file.path,
    header: [
      `${direction.sourceLabel} deleted this file; ${direction.targetLabel} had edited it.`,
      `Source commit: ${sha}`,
      'The deletion has been applied. Below is the version that was removed.',
      'If the edits still matter, re-add them somewhere that survives the deletion.',
    ],
    content: targetBlob,
  });
  ctx.conflicts.push({ path: file.path, kind: 'deleted upstream, edited here', sha, parkedAs });
  return 'conflict';
}

function applyFile(ctx, file) {
  const { sourceRepo, targetRepo, sha, direction } = ctx;

  if (file.status === 'R' || file.status === 'C') {
    return applyRename(ctx, file);
  }

  const abs = path.join(targetRepo, file.path);
  const parent = readParentBlob(sourceRepo, sha, file.path);
  const targetExists = fs.existsSync(abs);
  const targetBlob = targetExists ? fs.readFileSync(abs) : null;

  if (file.status === 'D') {
    return applyDelete(ctx, file, { parent, targetExists, targetBlob });
  }

  const blob = readSourceBlob(sourceRepo, sha, file.path);

  // Did the target match the source's pre-image? If so this is a clean
  // fast-forward; otherwise the two sides diverged.
  const divergent =
    file.status === 'A'
      ? targetExists
      : !(parent && targetExists && parent.equals(targetBlob));

  if (!divergent || direction.conflictPolicy === 'source-wins') {
    writeFileEnsuringDir(abs, blob);
    git(targetRepo, ['add', '-f', '--', file.path]);
    return divergent ? 'force' : 'clean';
  }

  // Target already has exactly what's coming in — nothing to reconcile.
  if (targetBlob && targetBlob.equals(blob)) return 'clean';

  return resolveDivergence(ctx, {
    filePath: file.path,
    absPath: abs,
    base: parent,
    ours: targetBlob,
    theirs: blob,
    kind: file.status === 'A' ? 'added on both sides' : 'modified on both sides',
  });
}

module.exports = { applyFile, readSourceBlob, readParentBlob };
