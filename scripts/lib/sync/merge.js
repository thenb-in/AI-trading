//
// merge.js — three-way merge and conflict parking.
//
// Used by the `merge-then-park` conflict policy (framework -> app). The
// contract, in one sentence: the source side always wins in the tree, and
// nothing the target loses is ever discarded — it is parked under
// `sync-conflicts/` where a blocking CI check can see it.
//
// Why source-wins in the tree rather than target-wins:
//   * The branch stays parseable, so lint/build/tests actually run on it. A
//     tree full of conflict markers fails at the parser and tells the review
//     nothing about whether the change works.
//   * It stops conflicts cascading. Once the file in the tree holds the
//     source's post-commit blob, the NEXT source commit touching that file
//     matches its own parent blob and applies clean. Target-wins would make
//     every later commit on that file re-conflict for the rest of the run.
//   * A framework change that needs an app-side adaptation shows up as a red
//     test rather than a green PR that quietly doesn't contain the change.
//

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { git } = require('./git');

const CONFLICT_DIR = 'sync-conflicts';
const CONFLICT_FILES_SUBDIR = 'files';
// Parked files keep their original path but gain a `.conflict` extension, so
// no linter, bundler or test runner in the target tries to parse a file full
// of merge markers, while GitHub still renders it as reviewable text.
const CONFLICT_SUFFIX = '.conflict';

function isBinary(buf) {
  return Boolean(buf) && buf.includes(0);
}

function writeFileEnsuringDir(absPath, contents) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, contents);
}

// Three-way merge via `git merge-file`. Returns
// { clean: boolean, content: Buffer }, where a non-clean result still carries
// the full diff3-marked output (ours / base / theirs all present).
// `favor: 'theirs'` resolves conflicting hunks in favour of the source rather
// than leaving markers, while still merging every non-conflicting hunk. That
// is what goes into the tree on a conflict: writing the raw source file there
// instead would throw away all of the target's OTHER edits to that file, not
// just the contested ones.
function mergeThreeWay({ base, ours, theirs, oursLabel, theirsLabel, favor }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-merge-'));
  try {
    const oursPath = path.join(dir, 'ours');
    const basePath = path.join(dir, 'base');
    const theirsPath = path.join(dir, 'theirs');
    fs.writeFileSync(oursPath, ours || Buffer.alloc(0));
    fs.writeFileSync(basePath, base || Buffer.alloc(0));
    fs.writeFileSync(theirsPath, theirs || Buffer.alloc(0));
    try {
      const out = execFileSync(
        'git',
        [
          'merge-file', '-p',
          ...(favor ? [`--${favor}`] : ['--diff3']),
          '-L', oursLabel, '-L', 'base (common ancestor)', '-L', theirsLabel,
          oursPath, basePath, theirsPath,
        ],
        { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 }
      );
      return { clean: true, content: out };
    } catch (e) {
      // `git merge-file` exits with the number of conflict hunks, so a
      // non-zero status here is the normal conflict path, not a failure.
      // Anything above 127 (or no stdout at all) is a real error.
      if (e.status === undefined || e.status > 127 || !e.stdout) throw e;
      return { clean: false, content: e.stdout };
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function parkedPathFor(filePath) {
  return path.join(CONFLICT_DIR, CONFLICT_FILES_SUBDIR, `${filePath}${CONFLICT_SUFFIX}`);
}

// Park the losing content next to a header describing what happened, and
// stage it so it rides along in the same commit as the conflicted file.
function parkConflict(targetRepo, { filePath, header, content }) {
  const rel = parkedPathFor(filePath);
  const banner = Buffer.from(
    `${header.map((l) => `# ${l}`).join('\n')}\n` +
    '#\n' +
    '# Resolve by editing the real file, then deleting this .conflict file.\n' +
    `# The PR cannot merge while ${CONFLICT_DIR}/ still has entries.\n` +
    '# ---------------------------------------------------------------\n\n'
  );
  writeFileEnsuringDir(path.join(targetRepo, rel), Buffer.concat([banner, content]));
  git(targetRepo, ['add', '-f', '--', rel]);
  return rel;
}

// End-of-run reconciliation.
//
// Conflicts are detected per commit, against that commit's post-image. But
// what the reviewer has to reconcile is the state at the END of the range,
// and the two differ whenever a later commit touched the same file:
//
//   * A conflict recorded at commit 3 may simply not exist at the tip — a
//     later commit can move the source's side back into line with what the
//     target had. Re-merging against the final tree resolves those with no
//     human involvement at all, which is the whole point of the exercise.
//   * A conflict that IS still real would otherwise be parked showing the
//     incoming side as it looked at commit 3 — stale, and misleading to
//     whoever opens it.
//
// So once every commit is applied, re-merge each conflicted file one last
// time: original base, the target's original content, and the source's FINAL
// content. Clean merges are written back and the conflict dropped; the rest
// get their parked file rewritten against the tip.
function reconcileParkedConflicts(targetRepo, conflicts, blobs, direction, stage) {
  const remaining = [];
  const resolved = [];
  // A path that conflicted in several commits is listed once per commit, all
  // sharing one parked file. Reconcile it once, from its first conflict —
  // a second pass would stage a parked file the first pass already removed.
  const seen = new Set();
  for (const c of conflicts) {
    if (seen.has(c.path)) continue;
    seen.add(c.path);
    const rec = blobs.get(c.path);
    const abs = path.join(targetRepo, c.path);
    // Deletion conflicts have no merge to redo, and a file that is gone from
    // the tree can't be re-merged either.
    if (!rec || !fs.existsSync(abs)) { remaining.push(c); continue; }

    const theirs = fs.readFileSync(abs);
    if (isBinary(rec.ours) || isBinary(theirs)) { remaining.push(c); continue; }

    const merged = mergeThreeWay({
      base: rec.base,
      ours: rec.ours,
      theirs,
      oursLabel: `${direction.targetLabel} (this repo)`,
      theirsLabel: `${direction.sourceLabel} (incoming, at tip)`,
    });

    if (merged.clean) {
      // Strictly better than what the tree holds: the source's final content
      // WITH the target's non-overlapping edits kept.
      writeFileEnsuringDir(abs, merged.content);
      stage(c.path);
      // Only a conflict parked by an earlier run has a `.conflict` file to
      // remove. A first-time conflict that merged against an intermediate commit
      // but is clean against the tip was never parked, so staging its "removal"
      // would fail on a pathspec git has never seen.
      const parkedAbs = path.join(targetRepo, c.parkedAs);
      if (fs.existsSync(parkedAbs)) {
        fs.rmSync(parkedAbs, { force: true });
        stage(c.parkedAs);
      }
      resolved.push(c.path);
      continue;
    }

    // Still contested: keep the target's non-conflicting edits in the tree and
    // take the source only where they genuinely overlap.
    writeFileEnsuringDir(abs, mergeThreeWay({
      base: rec.base,
      ours: rec.ours,
      theirs,
      oursLabel: 'ours',
      theirsLabel: 'theirs',
      favor: 'theirs',
    }).content);
    stage(c.path);

    writeFileEnsuringDir(
      path.join(targetRepo, c.parkedAs),
      Buffer.concat([
        Buffer.from(
          `# Overlapping edits could not be merged automatically (${c.kind}).\n` +
          `# First conflicting source commit: ${c.sha}\n` +
          `# ${c.path} in the tree holds the ${direction.sourceLabel} version at tip.\n` +
          '# Below is the three-way merge against that tip version.\n' +
          '#\n' +
          '# Resolve by editing the real file, then deleting this .conflict file.\n' +
          `# The PR cannot merge while ${CONFLICT_DIR}/ still has entries.\n` +
          '# ---------------------------------------------------------------\n\n'
        ),
        merged.content,
      ])
    );
    stage(c.parkedAs);
    remaining.push(c);
  }
  return { remaining, resolved };
}

function renderReport(conflicts, resolved, meta) {
  const lines = [];
  lines.push('# Unresolved sync conflicts');
  lines.push('');
  lines.push(
    `${conflicts.length} file(s) could not be merged automatically while syncing ` +
    `${meta.sourceLabel} -> ${meta.targetLabel}.`
  );
  lines.push('');
  lines.push(
    `**This PR is blocked until this directory is empty.** The \`${meta.checkName}\` ` +
    'check fails while any `.conflict` file remains.'
  );
  lines.push('');
  lines.push('## How to resolve');
  lines.push('');
  lines.push(`1. Open the \`.conflict\` file under \`${CONFLICT_DIR}/${CONFLICT_FILES_SUBDIR}/\`.`);
  lines.push(
    `2. It holds a diff3 merge: \`${meta.targetLabel}\` (what this repo had), the common ` +
    `ancestor, and \`${meta.sourceLabel}\` (what is being synced in).`
  );
  lines.push('3. Edit the **real** file to the reconciled result.');
  lines.push(`4. Delete the \`.conflict\` file. When \`${CONFLICT_DIR}/\` is empty, the check passes.`);
  lines.push('');
  lines.push(
    `The real file currently holds the \`${meta.sourceLabel}\` version — the source wins in ` +
    'the tree so the branch stays buildable and testable. Anything this repo had that the ' +
    'source overwrote is in the `.conflict` file, not lost.'
  );
  lines.push('');
  if (resolved && resolved.length) {
    lines.push(
      `${resolved.length} further file(s) conflicted against an intermediate commit but ` +
      'merged cleanly against the source tip, and were resolved automatically: ' +
      resolved.map((p) => `\`${p}\``).join(', ') + '.'
    );
    lines.push('');
  }
  lines.push('## Conflicts');
  lines.push('');
  lines.push('| File | Kind | Source commit | Parked as |');
  lines.push('|---|---|---|---|');
  for (const c of conflicts) {
    lines.push(
      `| \`${c.path}\` | ${c.kind} | \`${c.sha.slice(0, 12)}\` | \`${c.parkedAs}\` |`
    );
  }
  lines.push('');
  return lines.join('\n');
}

// Parked conflicts left by EARLIER runs. Reconciliation only ever looks at the
// current run's list, so without this a conflict parked last week keeps the
// check red forever while the report explaining it gets deleted.
function listStaleParks(targetRepo, knownPaths) {
  const root = path.join(targetRepo, CONFLICT_DIR, CONFLICT_FILES_SUBDIR);
  const found = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith(CONFLICT_SUFFIX)) continue;
      const parkedAs = path.relative(targetRepo, full);
      const original = path
        .relative(root, full)
        .slice(0, -CONFLICT_SUFFIX.length);
      if (knownPaths.has(original)) continue;
      found.push({ path: original, kind: 'parked by an earlier run', sha: '', parkedAs });
    }
  };
  walk(root);
  return found;
}

function writeReport(targetRepo, conflicts, resolved, meta) {
  const rel = path.join(CONFLICT_DIR, 'REPORT.md');
  const abs = path.join(targetRepo, rel);
  const conflictDirAbs = path.join(targetRepo, CONFLICT_DIR);
  if (conflicts.length === 0) {
    // Everything reconciled against the tip — leave nothing behind for the
    // check to trip on.
    fs.rmSync(abs, { force: true });
    // `-A` on a pathspec matching nothing is a fatal git error, so only stage
    // the directory when it is actually there. `-f` because a repo may well
    // gitignore it.
    if (fs.existsSync(conflictDirAbs)) {
      git(targetRepo, ['add', '-A', '-f', '--', CONFLICT_DIR]);
    }
    return null;
  }
  writeFileEnsuringDir(abs, renderReport(conflicts, resolved, meta));
  git(targetRepo, ['add', '-f', '--', rel]);
  return rel;
}

module.exports = {
  listStaleParks,
  reconcileParkedConflicts,
  CONFLICT_DIR,
  CONFLICT_FILES_SUBDIR,
  CONFLICT_SUFFIX,
  isBinary,
  writeFileEnsuringDir,
  mergeThreeWay,
  parkConflict,
  writeReport,
};
