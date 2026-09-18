//
// apply.js — per-file application.
//
// Classifications returned:
//   clean    — the target matched the source's pre-image (or didn't have the
//              file); applying was a straight fast-forward.
//   merged   — the target had divergent content but the edits didn't overlap,
//              so a three-way merge resolved it.
//   conflict — genuinely overlapping edits. The source wins in the tree, and
//              the target's losing content is parked under sync-conflicts/
//              (see merge.js for why round this way).
//
// Both directions reconcile. An earlier version let the app -> framework
// direction simply overwrite on divergence, on the theory that the framework
// repo is a pure downstream copy of those paths. It isn't: framework work is
// authored directly in the framework repo, and several apps sync into it. So
// overwriting silently reverted framework-native commits, and let one app
// clobber another's framework change, with nothing but a line in a log to
// show for it.
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

// Git tracks a file's mode, but blob content doesn't carry it: writing a blob
// out with fs.writeFileSync always produces 100644 for a new file. `.husky/`
// and `deploy/` are framework prefixes full of shell scripts that must stay
// 100755 — get this wrong and the sync looks perfectly clean while the hook or
// the deploy script silently stops being executable in every app repo.
function readSourceMode(sourceRepo, sha, p) {
  const out = git(sourceRepo, ['ls-tree', sha, '--', p]).trim();
  return out ? out.split(/\s+/)[0] : null;
}

// Symlinks (120000) and gitlinks/submodules (160000) can't be represented by
// writing bytes to a file — doing so turns a symlink into a regular file whose
// contents are the link target. Park them rather than corrupt them.
const MODE_SYMLINK = '120000';
const MODE_GITLINK = '160000';
const MODE_EXEC = '100755';

function applyMode(targetRepo, filePath, mode) {
  if (mode !== MODE_EXEC && mode !== '100644') return;
  git(targetRepo, ['update-index', '--chmod=' + (mode === MODE_EXEC ? '+x' : '-x'), '--', filePath]);
}

function writeAndStage(targetRepo, filePath, absPath, content, mode) {
  writeFileEnsuringDir(absPath, content);
  git(targetRepo, ['add', '-f', '--', filePath]);
  if (mode) applyMode(targetRepo, filePath, mode);
}

// Resolve a divergence: always writes the winning content and stages the
// file; records a conflict on the context when the merge can't be resolved.
function resolveDivergence(ctx, { filePath, absPath, base, ours, theirs, kind, mode }) {
  const { targetRepo, sha, direction } = ctx;

  // Keep the FIRST base/ours seen for a path. That pair is the target's true
  // pre-sync state, which is what the end-of-run reconciliation merges
  // against — a later commit would give a base already polluted by this run.
  if (!ctx.conflictBlobs.has(filePath)) {
    ctx.conflictBlobs.set(filePath, { base, ours });
  }

  const park = (header, content) => {
    const parkedAs = parkConflict(targetRepo, { filePath, header, content });
    ctx.conflicts.push({ path: filePath, kind, sha, parkedAs });
    return 'conflict';
  };

  if (isBinary(ours) || isBinary(theirs)) {
    writeAndStage(targetRepo, filePath, absPath, theirs, mode);
    return park(
      [
        `Binary file diverged; cannot three-way merge (${kind}).`,
        `Source commit: ${sha}`,
        `The tree now holds the ${direction.sourceLabel} version.`,
        `Below is the ${direction.targetLabel} version that it replaced.`,
      ],
      ours || Buffer.alloc(0)
    );
  }

  const merged = mergeThreeWay({
    base,
    ours,
    theirs,
    oursLabel: `${direction.targetLabel} (this repo)`,
    theirsLabel: `${direction.sourceLabel} (incoming)`,
  });

  if (merged.clean) {
    writeAndStage(targetRepo, filePath, absPath, merged.content, mode);
    return 'merged';
  }

  // Overlapping edits. The source wins where they genuinely overlap, but the
  // target's other edits to this file are kept — writing the raw source blob
  // here would discard them silently. The full diff3 is parked for review.
  const favored = mergeThreeWay({
    base,
    ours,
    theirs,
    oursLabel: `${direction.targetLabel} (this repo)`,
    theirsLabel: `${direction.sourceLabel} (incoming)`,
    favor: 'theirs',
  });
  writeAndStage(targetRepo, filePath, absPath, favored.content, mode);
  return park(
    [
      `Overlapping edits could not be merged automatically (${kind}).`,
      `Source commit: ${sha}`,
      `${filePath} in the tree now holds the ${direction.sourceLabel} version.`,
      'Below is the full three-way merge, markers and all.',
    ],
    merged.content
  );
}

function applyRename(ctx, file) {
  const { sourceRepo, targetRepo, sha } = ctx;
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

  // Target never had the old path and doesn't have the new one either: there
  // is nothing to reconcile, this is simply a new file. Falling through would
  // three-way merge against a null `ours`, which git reads as "we deleted
  // everything" and conflicts on the whole file — parking a bogus conflict
  // that blocks the PR with nothing for a human to actually resolve.
  if (!oldExists && !fs.existsSync(newAbs)) {
    writeAndStage(targetRepo, file.path, newAbs, blob, readSourceMode(sourceRepo, sha, file.path));
    return 'clean';
  }

  if (!divergent) {
    writeAndStage(targetRepo, file.path, newAbs, blob, readSourceMode(sourceRepo, sha, file.path));
    return 'clean';
  }

  // Rename-plus-edit against a target that also edited the old path: merge
  // the target's old content into the source's new content.
  return resolveDivergence(ctx, {
    filePath: file.path,
    absPath: newAbs,
    base: parent,
    ours: oldBlob,
    theirs: blob,
    mode: readSourceMode(sourceRepo, sha, file.path),
    kind: `${file.status === 'R' ? 'rename' : 'copy'} from ${file.oldPath}`,
  });
}

function applyDelete(ctx, file, { parent, targetExists, targetBlob }) {
  const { targetRepo, sha, direction } = ctx;
  if (targetExists) {
    git(targetRepo, ['rm', '-f', '--', file.path]);
  }
  // If the target didn't have it, the deletion is a silent no-op.
  if (!targetExists) return 'clean';
  if (parent && parent.equals(targetBlob)) return 'clean';

  // The source deleted a file the target had independently edited. The
  // deletion stands, but the target's version must not vanish unreviewed.
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
  ctx.conflicts.push({
    path: file.path,
    kind: 'deleted upstream, edited here',
    sha,
    parkedAs,
  });
  return 'conflict';
}

// A mode git can't express as file bytes. Writing it would silently turn a
// symlink into a regular file containing the link target, or a submodule
// pointer into a text file — both look clean in the diff and break at runtime.
function parkUnwritable(ctx, file, mode, blob) {
  const { targetRepo, sha, direction } = ctx;
  const kind = mode === MODE_SYMLINK ? 'symlink' : 'submodule pointer';
  const parkedAs = parkConflict(targetRepo, {
    filePath: file.path,
    header: [
      `${file.path} is a ${kind} (mode ${mode}) in ${direction.sourceLabel}.`,
      `Source commit: ${sha}`,
      'Sync cannot write this as file content without corrupting it, so it was',
      'NOT applied. Recreate it by hand in this repo, then delete this file.',
    ],
    content: blob,
  });
  ctx.conflicts.push({ path: file.path, kind: `unsupported mode (${kind})`, sha, parkedAs });
  return 'conflict';
}

function applyFile(ctx, file) {
  const { sourceRepo, targetRepo, sha } = ctx;

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
  const mode = readSourceMode(sourceRepo, sha, file.path);

  if (mode === MODE_SYMLINK || mode === MODE_GITLINK) {
    return parkUnwritable(ctx, file, mode, blob);
  }

  // Target already has exactly what's coming in — but the MODE may still
  // differ, so reassert it before calling this done.
  if (targetExists && targetBlob.equals(blob)) {
    applyMode(targetRepo, file.path, mode);
    return 'clean';
  }

  // Did the target match the source's pre-image? If so this is a clean
  // fast-forward; otherwise the two sides diverged.
  const divergent =
    file.status === 'A'
      ? targetExists
      : !(parent && targetExists && parent.equals(targetBlob));

  if (!divergent) {
    writeAndStage(targetRepo, file.path, abs, blob, mode);
    return 'clean';
  }

  return resolveDivergence(ctx, {
    filePath: file.path,
    absPath: abs,
    base: parent,
    ours: targetBlob,
    theirs: blob,
    mode,
    kind: file.status === 'A' ? 'added on both sides' : 'modified on both sides',
  });
}

module.exports = { applyFile, readSourceBlob, readParentBlob };
