#!/usr/bin/env node
//
// sync-startup.js
//
// Per-commit sync of etime-payroll's framework code (and any applicable
// non-framework edits) into the `thenb-in/startup` repo.
// Designed to be driven nightly by `.github/workflows/sync-startup.yml`
// but also runnable by hand for backfill / debugging.
//
// File classification (see FRAMEWORK_PREFIXES + NEVER_PICK below):
//   * FRAMEWORK — `startup/`, `nucleus/`, `lints/`, `deploy/`, `.github/`,
//     `.vscode/`, `.husky/`. Always picked.
//   * NEVER PICK — `tests/`, any `package.json`, any `package-lock.json`.
//     Always skipped: tests are mostly app-specific, and pkg manifests +
//     lockfiles tie the app's identity (name, version, deps) to its repo
//     so syncing them across repos breaks the target.
//   * APP — everything else. Picked only if the file already exists in
//     the target (we never create a new app file via sync).
//
// Rules:
//   * For each source commit that touches at least one FRAMEWORK file:
//       - Apply every FRAMEWORK change.
//       - Apply each APP change only when the target already has the file.
//       - Drop every NEVER-PICK change silently (logged for visibility).
//       - On any content conflict, prefer the source's post-commit blob
//         (overwrite the target file with what the source has).
//   * Skip commits with no FRAMEWORK file changes.
//   * Skip merge commits (their diffs are already covered by their
//     non-merge parents).
//   * Renames are atomic: an APP rename is picked when the OLD path
//     exists in the target (we're moving an existing file to a new name,
//     not creating a new one). Without this, rename pairs split into
//     delete+add and the add side would be silently dropped, leaving
//     callers of the renamed file (lint rule indexes, imports, …)
//     pointing at a missing path.
//   * After all per-commit applies, "tail up" APP files: for any APP
//     file we picked at any point during this run, refresh its content
//     to whatever the source has at `sourceBranch` tip. This catches
//     the case where a later source commit fixed the same file but was
//     skipped because it didn't touch FRAMEWORK paths — without the
//     tail-up the target would be stuck on the broken intermediate.
//     One trailing `chore(sync): refresh ...` commit captures all of it.
//
// Output:
//   * One commit on the target sync branch per applied source commit,
//     preserving author + date + subject, with a `Synced-from-etime-payroll`
//     trailer pointing to the source SHA.
//   * Logs written under `--log-dir`:
//       - sync-log.json  (structured)
//       - sync-log.md    (human-readable summary + per-commit detail)
//       - sync-log.txt   (terminal-style)
//   * On stdout, an end-of-run summary.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const Table = require('cli-table3');

const TRAILER_KEY = 'Synced-from-etime-payroll';
const SYNC_USER_NAME = process.env.GIT_SYNC_USER_NAME || 'startup-sync-bot';
const SYNC_USER_EMAIL =
  process.env.GIT_SYNC_USER_EMAIL || 'startup-sync-bot@users.noreply.github.com';

// Paths classified as framework — always picked when a commit touches at
// least one of them. Keep these as folder prefixes (trailing slash) so
// path matching stays a cheap startsWith check.
const FRAMEWORK_PREFIXES = [
  'startup/',
  // Shared, framework-agnostic infra (logger, generic constants, env/config)
  // that startup/server/* re-exports via thin shims and the @nucleus alias.
  // Without syncing nucleus/, those shims land in the target without their
  // implementation and the server fails to boot ("Cannot find module
  // ../../nucleus/logger"). package.json/lock stay never-pick (below), so a
  // new nucleus runtime dep still needs a one-off vendor in the target.
  'nucleus/',
  // Standalone socket-RPC report runner. Framework plumbing (depends on
  // @startup socket infra); ships with the template so apps can offload
  // report execution. Its package.json/lock stay never-pick (below).
  'report_runner/',
  'lints/',
  'deploy/',
  '.github/',
  '.vscode/',
  '.husky/',
];

// Paths we never sync, even if they'd otherwise qualify. Tests are
// largely app-specific; pkg manifests + lockfiles tie name/version/deps
// to the app's identity and shouldn't cross repo boundaries.
const NEVER_PICK_PATTERNS = [
  /^tests\//,
  /(^|\/)package\.json$/,
  /(^|\/)package-lock\.json$/,
  // Per-app content that lives under a framework path. AppDashboard.jsx
  // registers the app's concrete routes (imports @app/components/masters/*
  // etc.); in this monorepo it's populated, but the framework template must
  // keep it an empty `appRoutes = []` scaffold or the target fails to build
  // (those @app components don't exist there). Never sync it.
  /^startup\/client\/src\/pages\/AppDashboard\.jsx$/,
];

// ─── git helpers ──────────────────────────────────────────────────────────

function git(repo, args, { input, env } = {}) {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    input,
    env: env || process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  });
}

function gitBuf(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], {
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  });
}

function gitTry(repo, args) {
  try {
    return { ok: true, out: git(repo, args) };
  } catch (e) {
    return { ok: false, err: e };
  }
}

// ─── commit walking ───────────────────────────────────────────────────────

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

function getCommitFiles(sourceRepo, sha) {
  // Rename detection ON (`-M`). Without it, a rename would split into
  // delete-old + add-new and the "don't create new non-startup files"
  // rule would silently drop the new side — leaving callers of the
  // renamed file (e.g. lint rule indexes) pointing at a missing path.
  // For renames we emit a single item with both paths and let the
  // applier do an atomic move.
  // `-M20` lowers the rename-similarity threshold from git's default 50%
  // to 20%. We routinely see rename-with-significant-rewrite (e.g.
  // 60→140 line rule file that the diff-line count tips below 50% but
  // the basename and intent make obviously the same file) and 20% still
  // requires substantial content overlap, so false positives are rare.
  const out = git(sourceRepo, [
    'show', '-M20',
    '--name-status',
    '--format=',
    sha,
  ]);
  const items = [];
  for (const line of out.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('\t');
    const status = parts[0][0];
    if (status === 'R' || status === 'C') {
      // R100\toldpath\tnewpath   /   C90\tsrc\tdst
      items.push({
        status,
        oldPath: parts[1],
        path: parts[2],
      });
    } else {
      items.push({ status, path: parts[1] });
    }
  }
  return items.filter((f) => f.path);
}

function isFrameworkPath(p) {
  return FRAMEWORK_PREFIXES.some(
    (pfx) => p === pfx.slice(0, -1) || p.startsWith(pfx)
  );
}

function isNeverPickPath(p) {
  return NEVER_PICK_PATTERNS.some((re) => re.test(p));
}

function classifyPath(p) {
  if (isNeverPickPath(p)) return 'excluded';
  if (isFrameworkPath(p)) return 'framework';
  return 'app';
}

function targetHasFile(targetRepo, p) {
  return fs.existsSync(path.join(targetRepo, p));
}

// ─── per-file application ─────────────────────────────────────────────────

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

function writeFileEnsuringDir(absPath, contents) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, contents);
}

// Returns 'clean' | 'force'.
// "force" = target's current content differed from source's parent (i.e.,
// applying as a patch would have conflicted; we discarded the target's
// independent edits in favour of the source's post-commit version).
function applyFileAndClassify(sourceRepo, targetRepo, sha, file) {
  // Renames + copies are atomic: rm old, write new at new path.
  if (file.status === 'R' || file.status === 'C') {
    const newAbs = path.join(targetRepo, file.path);
    const oldAbs = file.oldPath ? path.join(targetRepo, file.oldPath) : null;
    // Classification for rename: clean if the target's content at the OLD
    // path matched the source's pre-image at the old path (i.e., we're
    // moving content that wasn't independently edited). Otherwise force.
    const parent = readParentBlob(sourceRepo, sha, file.oldPath);
    const oldExists = oldAbs && fs.existsSync(oldAbs);
    const oldBlob = oldExists ? fs.readFileSync(oldAbs) : null;
    const classification =
      parent && oldExists && parent.equals(oldBlob) ? 'clean' : 'force';
    if (file.status === 'R' && oldExists) {
      git(targetRepo, ['rm', '-f', '--', file.oldPath]);
    }
    const blob = readSourceBlob(sourceRepo, sha, file.path);
    writeFileEnsuringDir(newAbs, blob);
    git(targetRepo, ['add', '-f', '--', file.path]);
    return classification;
  }

  const abs = path.join(targetRepo, file.path);
  const parent = readParentBlob(sourceRepo, sha, file.path);
  const targetExists = fs.existsSync(abs);
  const targetBlob = targetExists ? fs.readFileSync(abs) : null;

  // Did the target match the source's pre-image? If so, this is a
  // clean fast-forward; otherwise we're overwriting divergent content.
  let classification;
  if (file.status === 'A') {
    classification = targetExists ? 'force' : 'clean';
  } else if (file.status === 'D') {
    classification =
      parent && targetExists && parent.equals(targetBlob) ? 'clean' : 'force';
  } else {
    // M / T / anything else with both sides present
    if (parent && targetExists && parent.equals(targetBlob)) classification = 'clean';
    else classification = 'force';
  }

  if (file.status === 'D') {
    if (targetExists) {
      git(targetRepo, ['rm', '-f', '--', file.path]);
    }
    // If target didn't have it, deletion is a silent no-op (already gone).
    return classification;
  }

  // A / M / T / fallback: write source's post-commit blob, stage it.
  const blob = readSourceBlob(sourceRepo, sha, file.path);
  writeFileEnsuringDir(abs, blob);
  git(targetRepo, ['add', '-f', '--', file.path]);
  return classification;
}

// ─── per-commit driver ────────────────────────────────────────────────────

function syncCommit(sourceRepo, targetRepo, sha) {
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
    framework: {
      total: 0,
      cleanPicks: [],   // [{ path, status, oldPath? }]
      forcePicks: [],
    },
    app: {
      total: 0,
      picks: [],        // file existed in target, change applied
      nonPicks: [],     // file absent in target, change skipped
    },
    excluded: {
      total: 0,
      files: [],        // matched NEVER_PICK_PATTERNS, dropped silently
    },
    targetSha: null,
    skipped: false,
    skipReason: null,
    error: null,
  };

  const files = getCommitFiles(sourceRepo, sha);
  // Bucket each file by path: framework (always pick), app (pick-if-exists),
  // or excluded (skip even if it exists). For rename/copy entries the
  // "primary" path used for classification is the NEW path, since that's
  // where the file ends up in the target.
  const buckets = { framework: [], app: [], excluded: [] };
  for (const f of files) buckets[classifyPath(f.path)].push(f);

  if (buckets.framework.length === 0) {
    // Commit-level skip: nothing to anchor the commit on the framework
    // side. We don't try to apply app or excluded edits in this case
    // (without a framework change the commit doesn't belong here).
    // Reason includes the per-bucket counts so the log is honest about
    // what we looked at vs. what we ignored.
    result.skipped = true;
    result.skipReason =
      `no framework file changes ` +
      `(app: ${buckets.app.length}, excluded: ${buckets.excluded.length} ignored)`;
    return result;
  }

  result.framework.total = buckets.framework.length;
  result.app.total = buckets.app.length;
  result.excluded.total = buckets.excluded.length;
  for (const f of buckets.excluded) {
    result.excluded.files.push({
      path: f.path,
      oldPath: f.oldPath,
      status: f.status,
      reason: 'matched NEVER_PICK_PATTERNS (tests/, package.json, package-lock.json)',
    });
  }

  try {
    for (const f of buckets.framework) {
      const cls = applyFileAndClassify(sourceRepo, targetRepo, sha, f);
      const bucket = cls === 'force' ? 'forcePicks' : 'cleanPicks';
      result.framework[bucket].push({
        path: f.path,
        oldPath: f.oldPath,
        status: f.status,
      });
    }

    for (const f of buckets.app) {
      // Rename/copy: the rule "don't create new app files" applies to
      // brand-new paths, not to a renamed existing file. So a rename is
      // pickable when the OLD path exists in the target — we're moving
      // content, not creating a new file.
      const checkPath = (f.status === 'R' || f.status === 'C') ? f.oldPath : f.path;
      const exists = targetHasFile(targetRepo, checkPath);
      if (!exists) {
        result.app.nonPicks.push({
          path: f.path,
          oldPath: f.oldPath,
          status: f.status,
          reason:
            f.status === 'D' ? 'file already absent in target' :
            (f.status === 'R' || f.status === 'C')
              ? `rename/copy source absent in target (${f.oldPath})`
              : 'file does not exist in target',
        });
        continue;
      }
      const cls = applyFileAndClassify(sourceRepo, targetRepo, sha, f);
      result.app.picks.push({
        path: f.path,
        oldPath: f.oldPath,
        status: f.status,
        classification: cls, // exposed as extra detail for debugging
      });
    }

    const staged = git(targetRepo, ['diff', '--cached', '--name-only']).trim();
    if (!staged) {
      // Everything got filtered (e.g., only deletions of files already
      // absent in the target). Don't create an empty commit; still log it.
      result.skipped = true;
      result.skipReason = 'all changes filtered out after target-existence check';
      return result;
    }

    // Preserve the original author + date so blame stays meaningful in the
    // target repo. Committer is the sync bot.
    const message = `${body.trimEnd()}\n\n${TRAILER_KEY}: ${sha}\n`;
    git(
      targetRepo,
      [
        '-c', `user.name=${SYNC_USER_NAME}`,
        '-c', `user.email=${SYNC_USER_EMAIL}`,
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
    // Roll back any half-applied state so the next commit starts clean
    // and the worktree is sane for debugging.
    gitTry(targetRepo, ['reset', '--hard']);
    gitTry(targetRepo, ['clean', '-fd']);
    result.error = String((e && e.stderr && e.stderr.toString()) || e.message || e);
  }

  return result;
}

// ─── log rendering ────────────────────────────────────────────────────────

function summarize(results) {
  const sum = {
    totalCommits: results.commits.length,
    applied: 0,
    skipped: 0,
    failed: 0,
    frameworkCleanPicks: 0,
    frameworkForcePicks: 0,
    appPicks: 0,
    appNonPicks: 0,
    excluded: 0,
  };
  for (const c of results.commits) {
    if (c.error) sum.failed++;
    else if (c.skipped) sum.skipped++;
    else sum.applied++;
    if (c.framework) {
      sum.frameworkCleanPicks += c.framework.cleanPicks.length;
      sum.frameworkForcePicks += c.framework.forcePicks.length;
    }
    if (c.app) {
      sum.appPicks += c.app.picks.length;
      sum.appNonPicks += c.app.nonPicks.length;
    }
    if (c.excluded) sum.excluded += c.excluded.files.length;
  }
  return sum;
}

function renderMarkdown(results) {
  const sum = summarize(results);
  const lines = [];
  lines.push('# Startup sync log');
  lines.push('');
  lines.push(`- **Started:** ${results.startedAt}`);
  lines.push(`- **Finished:** ${results.finishedAt}`);
  lines.push(`- **Source:** etime-payroll @ \`${results.sourceBranch}\``);
  lines.push(`- **Range:** \`${results.fromSha || '(bootstrap)'}\`..\`${results.toSha}\``);
  lines.push(`- **Target branch:** \`${results.targetBranch}\``);
  lines.push('');
  lines.push(
    '> **Framework paths** (always picked): ' +
    FRAMEWORK_PREFIXES.map((p) => `\`${p}\``).join(', ') + '.  \n' +
    '> **Never-pick** (always skipped): `tests/`, all `package.json`, all `package-lock.json`.  \n' +
    '> **App paths** (everything else): picked only when the file already exists in the target.'
  );
  lines.push('');
  lines.push('## Run summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|---|---:|');
  lines.push(`| Commits examined | ${sum.totalCommits} |`);
  lines.push(`| Commits applied | ${sum.applied} |`);
  lines.push(`| Commits skipped | ${sum.skipped} |`);
  lines.push(`| Commits failed | ${sum.failed} |`);
  lines.push(`| Framework clean picks (files) | ${sum.frameworkCleanPicks} |`);
  lines.push(`| Framework force picks (files) | ${sum.frameworkForcePicks} |`);
  lines.push(`| App picks (files) | ${sum.appPicks} |`);
  lines.push(`| App non-picks (files) | ${sum.appNonPicks} |`);
  lines.push(`| Excluded never-pick (files) | ${sum.excluded} |`);
  if (results.tailup) {
    lines.push(`| Tail-up refreshed (files) | ${results.tailup.refreshed.length} |`);
    lines.push(`| Tail-up deleted (files) | ${results.tailup.deleted.length} |`);
  }
  lines.push('');
  if (results.tailup && (results.tailup.refreshed.length || results.tailup.deleted.length)) {
    lines.push('## Tail-up refresh');
    lines.push('');
    lines.push(
      'App files refreshed to source HEAD because later skipped source ' +
      'commits modified them after the picks above. Committed as ' +
      `\`${results.tailup.commitSha && results.tailup.commitSha.slice(0, 12)}\`.`
    );
    lines.push('');
    if (results.tailup.refreshed.length) {
      lines.push('_refreshed:_');
      for (const p of results.tailup.refreshed) lines.push(`  - \`${p}\``);
      lines.push('');
    }
    if (results.tailup.deleted.length) {
      lines.push('_deleted (file no longer exists at source HEAD):_');
      for (const p of results.tailup.deleted) lines.push(`  - \`${p}\``);
      lines.push('');
    }
  }
  lines.push('## Per-commit detail');
  lines.push('');
  for (const c of results.commits) {
    lines.push(`### \`${c.sha.slice(0, 12)}\` — ${c.subject}`);
    lines.push('');
    lines.push(`- **Author:** ${c.author}`);
    lines.push(`- **Date:** ${c.date}`);
    if (c.targetSha) lines.push(`- **Target commit:** \`${c.targetSha.slice(0, 12)}\``);
    if (c.error) lines.push(`- **Status:** ❌ FAILED — \`${c.error.split('\n')[0]}\``);
    else if (c.skipped) lines.push(`- **Status:** ⏭️  SKIPPED — ${c.skipReason}`);
    else lines.push('- **Status:** ✅ applied');
    lines.push('');
    // Only emit the file-count breakdowns when the commit was actually
    // processed; for commit-level skips the totals are recorded in the
    // skip reason and the per-bucket lists are empty by design.
    if (!c.skipped && !c.error) {
      const fmt = (f) => (f.oldPath ? `\`${f.oldPath}\` → \`${f.path}\`` : `\`${f.path}\``);
      if (c.framework) {
        lines.push(
          `**framework** files: ${c.framework.total} ` +
          `(clean: ${c.framework.cleanPicks.length}, force: ${c.framework.forcePicks.length})`
        );
        if (c.framework.cleanPicks.length) {
          lines.push('');
          lines.push('_clean picks:_');
          for (const f of c.framework.cleanPicks) lines.push(`  - ${f.status} ${fmt(f)}`);
        }
        if (c.framework.forcePicks.length) {
          lines.push('');
          lines.push('_force picks (target had divergent content; overwritten):_');
          for (const f of c.framework.forcePicks) lines.push(`  - ${f.status} ${fmt(f)}`);
        }
      }
      if (c.app) {
        lines.push('');
        lines.push(
          `**app** files: ${c.app.total} ` +
          `(picks: ${c.app.picks.length}, non-picks: ${c.app.nonPicks.length})`
        );
        if (c.app.picks.length) {
          lines.push('');
          lines.push('_picks (file existed in target, change applied):_');
          for (const f of c.app.picks) {
            lines.push(`  - ${f.status} ${fmt(f)} _(${f.classification})_`);
          }
        }
        if (c.app.nonPicks.length) {
          lines.push('');
          lines.push('_non-picks (file absent in target, change skipped):_');
          for (const f of c.app.nonPicks) {
            lines.push(`  - ${f.status} ${fmt(f)} — ${f.reason}`);
          }
        }
      }
      if (c.excluded && c.excluded.total > 0) {
        lines.push('');
        lines.push(`**excluded** files: ${c.excluded.total} (matched never-pick patterns)`);
        lines.push('');
        for (const f of c.excluded.files) {
          lines.push(`  - ${f.status} ${fmt(f)} — ${f.reason}`);
        }
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderText(results) {
  const sum = summarize(results);
  const out = [];
  out.push('================ startup sync ================');
  out.push(`range:  ${results.fromSha || '(bootstrap)'} .. ${results.toSha}`);
  out.push(`branch: ${results.targetBranch}`);
  out.push('');

  const headTable = new Table({ head: ['Metric', 'Count'] });
  headTable.push(
    ['Commits examined', sum.totalCommits],
    ['Commits applied', sum.applied],
    ['Commits skipped', sum.skipped],
    ['Commits failed', sum.failed],
    ['Framework clean picks (files)', sum.frameworkCleanPicks],
    ['Framework force picks (files)', sum.frameworkForcePicks],
    ['App picks (files)', sum.appPicks],
    ['App non-picks (files)', sum.appNonPicks],
    ['Excluded never-pick (files)', sum.excluded],
  );
  if (results.tailup) {
    headTable.push(
      ['Tail-up refreshed (files)', results.tailup.refreshed.length],
      ['Tail-up deleted (files)', results.tailup.deleted.length],
    );
  }
  out.push(headTable.toString());
  out.push(`framework prefixes: ${FRAMEWORK_PREFIXES.join(', ')}`);
  out.push('never-pick:         tests/, **/package.json, **/package-lock.json');
  out.push('');

  for (const c of results.commits) {
    out.push(`--- ${c.sha.slice(0, 12)}  ${c.subject}`);
    out.push(`    author: ${c.author}`);
    if (c.error) out.push(`    status: FAILED -- ${c.error.split('\n')[0]}`);
    else if (c.skipped) out.push(`    status: SKIPPED -- ${c.skipReason}`);
    else out.push(`    status: applied as ${c.targetSha && c.targetSha.slice(0, 12)}`);

    if (!c.skipped && !c.error) {
      const fmt = (f) => (f.oldPath ? `${f.oldPath} -> ${f.path}` : f.path);
      if (c.framework) {
        out.push(
          `    framework: total=${c.framework.total} ` +
          `clean=${c.framework.cleanPicks.length} force=${c.framework.forcePicks.length}`
        );
        for (const f of c.framework.cleanPicks) out.push(`      [clean] ${f.status} ${fmt(f)}`);
        for (const f of c.framework.forcePicks) out.push(`      [force] ${f.status} ${fmt(f)}`);
      }
      if (c.app) {
        out.push(
          `    app:       total=${c.app.total} ` +
          `picks=${c.app.picks.length} non-picks=${c.app.nonPicks.length}`
        );
        for (const f of c.app.picks) {
          out.push(`      [pick]   ${f.status} ${fmt(f)}  (${f.classification})`);
        }
        for (const f of c.app.nonPicks) {
          out.push(`      [skip]   ${f.status} ${fmt(f)}  -- ${f.reason}`);
        }
      }
      if (c.excluded && c.excluded.total > 0) {
        out.push(`    excluded:  total=${c.excluded.total}`);
        for (const f of c.excluded.files) {
          out.push(`      [excl]   ${f.status} ${fmt(f)}`);
        }
      }
    }
    out.push('');
  }
  return out.join('\n');
}

function writeLogs(results, logDir) {
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'sync-log.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(logDir, 'sync-log.md'), renderMarkdown(results));
  const text = renderText(results);
  fs.writeFileSync(path.join(logDir, 'sync-log.txt'), text);
  return text;
}

// ─── arg parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    args[m[1]] = m[2] === undefined ? true : m[2];
  }
  return args;
}

function fail(msg) {
  console.error(`[sync-startup] ${msg}`);
  process.exit(1);
}

// ─── main ─────────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  const sourceRepo = path.resolve(args['source-repo'] || '.');
  if (!args['target-repo']) fail('missing --target-repo=<path>');
  const targetRepo = path.resolve(args['target-repo']);
  const sourceBranch = args['source-branch'] || 'main';
  const targetBranch = args['target-branch'];
  if (!targetBranch) fail('missing --target-branch=<name>');
  const targetBaseBranch = args['target-base-branch'] || 'main';
  const logDir = path.resolve(args['log-dir'] || 'sync-logs');
  const startFrom = args['start-from'] || null;

  if (!fs.existsSync(path.join(sourceRepo, '.git'))) {
    fail(`source repo is not a git checkout: ${sourceRepo}`);
  }
  if (!fs.existsSync(path.join(targetRepo, '.git'))) {
    fail(`target repo is not a git checkout: ${targetRepo}`);
  }

  // 1) Make sure the target is on a clean working tree at the desired
  //    base, then create the per-night sync branch from it.
  git(targetRepo, ['fetch', 'origin', targetBaseBranch]);
  git(targetRepo, ['checkout', '-B', targetBranch, `origin/${targetBaseBranch}`]);

  // 2) Resolve the source range. The workflow is responsible for passing
  //    `--start-from` (read from the `startup-sync-state` tag); if absent,
  //    we anchor at the previous day's HEAD (i.e., process the last 24h
  //    of commits) so first runs don't try to replay all history.
  let fromSha = startFrom;
  if (!fromSha) {
    const anchor = gitTry(sourceRepo, [
      'rev-list', '-n', '1', '--before=24 hours ago', sourceBranch,
    ]);
    if (anchor.ok && anchor.out.trim()) {
      fromSha = anchor.out.trim();
      console.log(`[sync-startup] no --start-from given; anchoring at ${fromSha} (24h ago)`);
    }
  }
  const toSha = git(sourceRepo, ['rev-parse', sourceBranch]).trim();

  const commits = listCommitsToSync(sourceRepo, fromSha, sourceBranch);
  console.log(
    `[sync-startup] ${commits.length} commit(s) to examine (${fromSha || '(none)'} .. ${toSha})`
  );

  const results = {
    startedAt: new Date().toISOString(),
    sourceRepo,
    targetRepo,
    sourceBranch,
    targetBranch,
    targetBaseBranch,
    fromSha,
    toSha,
    commits: [],
  };

  for (const sha of commits) {
    const r = syncCommit(sourceRepo, targetRepo, sha);
    results.commits.push(r);
    const tag = r.error ? 'FAIL' : r.skipped ? 'skip' : 'OK  ';
    console.log(`  [${tag}] ${sha.slice(0, 12)}  ${r.subject}`);
    if (r.error) {
      // Halt on first error: a failed apply usually means our rules need a
      // tweak, and continuing would compound the mess. The log already
      // captured what we did and where we stopped.
      console.error(`[sync-startup] halting after error on ${sha}`);
      break;
    }
  }

  // ── App tail-up ────────────────────────────────────────────────────────
  //
  // Per-commit semantics leave a hole: an app file that gets picked at
  // commit N may have been further edited in later source commits that
  // got skipped here because they didn't touch FRAMEWORK paths. Those
  // edits are often bugfixes to the same file the earlier framework
  // commit wrote (e.g. a follow-up `fix:` on a script). Without catching
  // up, the target ends with a stale intermediate version.
  //
  // Approach: for every app file we picked at any point during this run,
  // compare its current content with the source's tip-of-branch content.
  // If they differ, refresh to the tip and stage. If anything gets
  // staged, land it as one trailing "chore(sync): refresh" commit.
  const touchedApp = new Set();
  for (const c of results.commits) {
    if (c.error || !c.app) continue;
    for (const f of c.app.picks) touchedApp.add(f.path);
  }
  const tailup = { refreshed: [], deleted: [], unchanged: 0, skipped: 0 };
  for (const p of touchedApp) {
    // The file might have been deleted in target by a later applied commit
    // — `targetHasFile` covers that. We only refresh files still present;
    // a deletion that mid-run picks already enacted is the right end state.
    if (!targetHasFile(targetRepo, p)) { tailup.skipped++; continue; }
    let headBlob;
    try {
      headBlob = readSourceBlob(sourceRepo, sourceBranch, p);
    } catch (_) {
      // File no longer exists at source HEAD: a later skipped commit must
      // have removed it. Mirror that here.
      git(targetRepo, ['rm', '-f', '--', p]);
      tailup.deleted.push(p);
      continue;
    }
    const targetBlob = fs.readFileSync(path.join(targetRepo, p));
    if (headBlob.equals(targetBlob)) { tailup.unchanged++; continue; }
    writeFileEnsuringDir(path.join(targetRepo, p), headBlob);
    git(targetRepo, ['add', '-f', '--', p]);
    tailup.refreshed.push(p);
  }
  if (tailup.refreshed.length || tailup.deleted.length) {
    const message =
      'chore(sync): refresh app files to source HEAD\n\n' +
      'Catches up files that were updated by source commits which were\n' +
      'skipped during this run because they touched only non-framework\n' +
      'paths. See per-commit log for the full list.\n\n' +
      `${TRAILER_KEY}-tail-up: ${toSha}\n`;
    git(
      targetRepo,
      [
        '-c', `user.name=${SYNC_USER_NAME}`,
        '-c', `user.email=${SYNC_USER_EMAIL}`,
        'commit',
        '--no-verify',
        '-m', message,
      ],
      { env: { ...process.env, HUSKY: '0' } }
    );
    tailup.commitSha = git(targetRepo, ['rev-parse', 'HEAD']).trim();
  }
  results.tailup = tailup;
  console.log(
    `[sync-startup] tail-up: refreshed=${tailup.refreshed.length} ` +
    `deleted=${tailup.deleted.length} unchanged=${tailup.unchanged} skipped=${tailup.skipped}`
  );

  results.finishedAt = new Date().toISOString();
  // The last successfully applied source commit — the workflow will move
  // the `startup-sync-state` tag to this SHA so the next run picks up
  // exactly where this one left off (including over skipped commits).
  let lastAppliedOrExamined = null;
  for (const c of results.commits) {
    if (c.error) break;
    lastAppliedOrExamined = c.sha;
  }
  results.advanceTagTo = lastAppliedOrExamined || fromSha || null;

  const text = writeLogs(results, logDir);
  fs.writeFileSync(
    path.join(logDir, 'advance-tag-to.txt'),
    `${results.advanceTagTo || ''}\n`
  );

  // GitHub-Actions-friendly outputs: when running under Actions the workflow
  // can read these via $GITHUB_OUTPUT to decide whether to push and PR.
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) {
    const sum = summarize(results);
    const lines = [
      `commits_examined=${sum.totalCommits}`,
      `commits_applied=${sum.applied}`,
      `commits_failed=${sum.failed}`,
      `commits_skipped=${sum.skipped}`,
      `target_branch=${targetBranch}`,
      `advance_tag_to=${results.advanceTagTo || ''}`,
      `has_changes=${sum.applied > 0 ? 'true' : 'false'}`,
    ];
    fs.appendFileSync(gho, lines.join('\n') + '\n');
  }

  console.log('\n' + text.split('\n').slice(0, 60).join('\n'));
  if (summarize(results).failed > 0) process.exit(2);
}

main();
