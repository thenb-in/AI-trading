#!/usr/bin/env node
/**
 * HOW TO FIX DUPLICATES
 *
 * When this check fails, don't just mechanically move duplicated code into shared functions.
 * Shared functions only make sense if they represent a meaningful concept or operation.
 *
 * Instead, look for the right approach based on context:
 *  - Parameterize: If two functions do nearly the same thing with small variations, add
 *    useful parameters (options, callbacks, config) to ONE function so it handles both cases.
 *    Example: a modal component that takes `entityName` and `onSubmitApi` instead of two
 *    near-identical modal components.
 *  - Extract meaningful operations: If the shared code represents a real domain concept
 *    (e.g. "rotate auth tokens", "resolve subscription status"), extract it as a named
 *    function that carries that meaning.
 *  - Don't extract noise: If the overlap is just boilerplate (error checks, response
 *    formatting), inlining it in each caller is often clearer than a shared wrapper with
 *    no real name or purpose.
 *
 * The goal is code that's easy to understand and maintain, not just code that passes this check.
 */

/**
 * Runs jscpd with `-r json --silent` (no clone spam to the terminal), reads the report, then prints:
 * 1) Only "Clone found" (or "Duplicates found" when two different files reach FILE_PAIR_DUPLICATION_LINE_RATIO of
 *    summed clone spans on both files vs combined line count linesA+linesB) blocks in the same shape as jscpd’s
 *    ProgressSubscriber, when the clone’s line span (endLine − startLine, same as ProgressSubscriber) is >=
 *    MAX_DUPLICATE_LINES_PER_FILE. Blocks are ordered: ordinary clones first (ascending span), then near-duplicate
 *    file pairs (ascending overlap %, then span). Near-duplicate headings include overlap % (vs linesA+linesB, capped at 100%) and format.
 * 2) The same cli-table3 summary shape as jscpd’s console reporter, but clone-related columns (clones, duplicated
 *    lines/tokens, percentages) are recomputed from listed clones only; then `Found N clones.`, then
 *    `Detection time:: …ms` (wall time for the jscpd subprocess). Plain text (no ANSI) for stable tooling/git output.
 * 3) A final `PASS` or `FAIL` line for the line-limit rule (exit 1 on FAIL).
 *
 * JSCPD_SKIP=1 — skip the check (exit 0).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');

/** Minimum clone line span to list (endLine − startLine, same as jscpd); FAIL if any file’s summed span from listed clones exceeds this (see violatingPathsFromListedClones). */
const MAX_DUPLICATE_LINES_PER_FILE = 15;

/** Lower threshold applied when either file in the clone pair is a utils file. */
const MAX_DUPLICATE_LINES_UTILS = 3;

/** Σ(span on file A + span on file B) for listed clones in the pair / (linesA+linesB) ≥ this ⇒ "Duplicates found". */
const FILE_PAIR_DUPLICATION_LINE_RATIO = 0.8;

function parseGitignorePatterns(gitignorePath) {
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }
  const raw = fs.readFileSync(gitignorePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || line.startsWith('#')) {
        return false;
      }
      if (line.startsWith('!')) {
        return false;
      }
      return true;
    });
}

/**
 * Convert each project dir's .gitignore into jscpd `-i` globs scoped to that dir.
 * Gitignore "dist" (no slash) matches at any depth; "foo/bar" is anchored to the gitignore root.
 * For each match we emit both `<scope>/<pat>` and `<scope>/<pat>/**` so directory entries
 * exclude their contents too.
 */
function scopedIgnoreGlobs(projectDirs) {
  const out = new Set();
  for (const dir of projectDirs) {
    const relDir = path.relative(REPO_ROOT, dir).split(path.sep).join('/');
    const patterns = parseGitignorePatterns(path.join(dir, '.gitignore'));
    for (const raw of patterns) {
      const trimmed = raw.replace(/^\/+/, '').replace(/\/+$/, '');
      if (!trimmed) {
        continue;
      }
      const anchored = raw.startsWith('/') || trimmed.includes('/');
      const base = anchored ? `${relDir}/${trimmed}` : `${relDir}/**/${trimmed}`;
      out.add(base);
      out.add(`${base}/**`);
    }
  }
  return Array.from(out);
}

function cloneDuplicatedTokenIncrement(dup) {
  const a = dup.firstFile;
  if (a.endLoc.position == null || a.startLoc.position == null) {
    return 0;
  }
  return a.endLoc.position - a.startLoc.position;
}

/**
 * Per-file duplicated line totals from listed clones only (each clone adds the same increment to both files, like jscpd).
 * Used for PASS/FAIL so the gate matches the summary table.
 */
function violatingPathsFromListedClones(listedClones) {
  /** @type {Map<string, number>} */
  const byFile = new Map();
  for (const dup of listedClones) {
    const inc = cloneFragmentLineSpan(dup);
    for (const name of [dup.firstFile.name, dup.secondFile.name]) {
      byFile.set(name, (byFile.get(name) ?? 0) + inc);
    }
  }
  const paths = new Set();
  for (const [relPath, duplicatedLines] of byFile) {
    if (duplicatedLines > MAX_DUPLICATE_LINES_PER_FILE) {
      paths.add(relPath);
    }
  }
  return paths;
}

/** Same as @jscpd/core Statistic.calculatePercentage */
function calculateDuplicatePercentage(total, cloned) {
  return total ? Math.round(10000 * (cloned / total)) / 100 : 0;
}

/** Line span (end − start) of the clone fragment on the given file path, or 0 if this clone does not touch that file. */
function cloneLineSpanOnFile(dup, fileName) {
  if (dup.firstFile.name === fileName) {
    return dup.firstFile.endLoc.line - dup.firstFile.startLoc.line;
  }
  if (dup.secondFile.name === fileName) {
    return dup.secondFile.endLoc.line - dup.secondFile.startLoc.line;
  }
  return 0;
}

/**
 * Deep clone of jscpd statistics with clones / duplicatedLines / duplicatedTokens / percentages
 * recomputed from listedClones only (files analyzed, total lines/tokens unchanged).
 */
function statisticsWithListedCloneMetrics(originalStatistic, listedClones) {
  const statistic = JSON.parse(JSON.stringify(originalStatistic));
  const formats = statistic.formats;
  if (!formats || typeof formats !== 'object') {
    return statistic;
  }

  for (const format of Object.keys(formats)) {
    const fmt = formats[format];
    if (!fmt.sources) {
      continue;
    }
    fmt.total.clones = 0;
    fmt.total.duplicatedLines = 0;
    fmt.total.duplicatedTokens = 0;
  }
  statistic.total.clones = 0;
  statistic.total.duplicatedLines = 0;
  statistic.total.duplicatedTokens = 0;

  for (const dup of listedClones) {
    const lines = cloneFragmentLineSpan(dup);
    const tokens = cloneDuplicatedTokenIncrement(dup);
    statistic.total.clones += 1;
    statistic.total.duplicatedLines += lines;
    statistic.total.duplicatedTokens += tokens;
    const fmt = formats[dup.format];
    if (fmt && fmt.total) {
      fmt.total.clones += 1;
      fmt.total.duplicatedLines += lines;
      fmt.total.duplicatedTokens += tokens;
    }
  }

  statistic.total.percentage = calculateDuplicatePercentage(
    statistic.total.lines,
    statistic.total.duplicatedLines,
  );
  statistic.total.percentageTokens = calculateDuplicatePercentage(
    statistic.total.tokens,
    statistic.total.duplicatedTokens,
  );

  for (const format of Object.keys(formats)) {
    const fmt = formats[format];
    if (!fmt.sources) {
      continue;
    }
    const t = fmt.total;
    t.percentage = calculateDuplicatePercentage(t.lines, t.duplicatedLines);
    t.percentageTokens = calculateDuplicatePercentage(t.tokens, t.duplicatedTokens);
  }

  return statistic;
}

/** Matches jscpd getSourceLocation / cloneFound (see @jscpd/finder). */
function formatLocation(startLoc, endLoc) {
  return `${startLoc.line}:${startLoc.column} - ${endLoc.line}:${endLoc.column}`;
}

/** Line span of the duplicate in firstFile (same as jscpd ProgressSubscriber: endLine − startLine). */
function cloneFragmentLineSpan(dup) {
  return dup.firstFile.endLoc.line - dup.firstFile.startLoc.line;
}

function unorderedFilePairKey(nameA, nameB) {
  return nameA < nameB ? `${nameA}\0${nameB}` : `${nameB}\0${nameA}`;
}

/**
 * Per unordered file pair: sum over listed clones of (span on file₁ + span on file₂), plus format and canonical paths.
 * Uses both sides of each clone so the metric matches the pair, not only firstFile.
 */
function pairLineAggregatesFromListedClones(listedClones) {
  /** @type {Map<string, { total: number, format: string, pathA: string, pathB: string }>} */
  const map = new Map();
  for (const dup of listedClones) {
    const p = dup.firstFile.name;
    const q = dup.secondFile.name;
    if (p === q) {
      continue;
    }
    const pathA = p < q ? p : q;
    const pathB = p < q ? q : p;
    const key = unorderedFilePairKey(p, q);
    const spanPair = cloneLineSpanOnFile(dup, pathA) + cloneLineSpanOnFile(dup, pathB);
    const prev = map.get(key);
    if (prev) {
      prev.total += spanPair;
    } else {
      map.set(key, { total: spanPair, format: dup.format, pathA, pathB });
    }
  }
  return map;
}

/**
 * For file pairs where summed (spanA+spanB) / (linesA+linesB) ≥ ratio: map pair key → overlap % (same rounding as
 * jscpd, capped at 100 so overlapping clone regions cannot report above 100%).
 */
function nearDuplicatePairOverlapPercentByKey(pairAggregates, statistics, ratio) {
  /** @type {Map<string, number>} */
  const map = new Map();
  const formats = statistics && statistics.formats;
  if (!formats || typeof formats !== 'object') {
    return map;
  }
  for (const [key, { total, format, pathA, pathB }] of pairAggregates) {
    const fmt = formats[format];
    const linesA = Number(fmt?.sources?.[pathA]?.lines);
    const linesB = Number(fmt?.sources?.[pathB]?.lines);
    if (!Number.isFinite(linesA) || !Number.isFinite(linesB)) {
      continue;
    }
    const combined = linesA + linesB;
    if (combined <= 0 || total / combined < ratio) {
      continue;
    }
    const raw = calculateDuplicatePercentage(combined, total);
    map.set(key, Math.min(100, raw));
  }
  return map;
}

function listedClonesSortComparator(a, b, nearDuplicatePairPercentByKey) {
  const keyA = unorderedFilePairKey(a.firstFile.name, a.secondFile.name);
  const keyB = unorderedFilePairKey(b.firstFile.name, b.secondFile.name);
  const nearA =
    a.firstFile.name !== a.secondFile.name && nearDuplicatePairPercentByKey.has(keyA);
  const nearB =
    b.firstFile.name !== b.secondFile.name && nearDuplicatePairPercentByKey.has(keyB);
  const groupA = nearA ? 1 : 0;
  const groupB = nearB ? 1 : 0;
  if (groupA !== groupB) {
    return groupA - groupB;
  }
  if (groupA === 1) {
    const pctA = nearDuplicatePairPercentByKey.get(keyA) ?? 0;
    const pctB = nearDuplicatePairPercentByKey.get(keyB) ?? 0;
    if (pctA !== pctB) {
      return pctA - pctB;
    }
  }
  const spanA = cloneFragmentLineSpan(a);
  const spanB = cloneFragmentLineSpan(b);
  if (spanA !== spanB) {
    return spanA - spanB;
  }
  return keyA.localeCompare(keyB);
}

/** Same layout as jscpd ProgressSubscriber cloneFound output (plain text). */
function printCloneBlock(dup, nearDuplicatePairPercentByKey) {
  const a = dup.firstFile;
  const b = dup.secondFile;
  const lineCountA = cloneFragmentLineSpan(dup);
  const tokenPart =
    a.endLoc.position != null && a.startLoc.position != null
      ? `, ${a.endLoc.position - a.startLoc.position} tokens`
      : '';
  const pairKey = unorderedFilePairKey(a.name, b.name);
  const overlapPct =
    a.name !== b.name ? nearDuplicatePairPercentByKey.get(pairKey) : undefined;
  const heading =
    overlapPct != null
      ? `Duplicates found (${overlapPct}%, ${dup.format})`
      : `Clone found (${dup.format})`;
  console.log(`${heading}:`);
  console.log(
    ` - ${a.name} [${formatLocation(a.startLoc, a.endLoc)}] (${lineCountA} lines${tokenPart})`,
  );
  console.log(`   ${b.name} [${formatLocation(b.startLoc, b.endLoc)}]`);
  console.log('');
}

function convertStatisticToArray(format, statistic) {
  return [
    format,
    `${statistic.sources}`,
    `${statistic.lines}`,
    `${statistic.tokens}`,
    `${statistic.clones}`,
    `${statistic.duplicatedLines} (${statistic.percentage}%)`,
    `${statistic.duplicatedTokens} (${statistic.percentageTokens}%)`,
  ];
}

function printConsoleSummary(statistic) {
  const Table = require('cli-table3');
  if (!statistic || !statistic.formats) {
    return;
  }
  const table = new Table({
    head: [
      'Format',
      'Files analyzed',
      'Total lines',
      'Total tokens',
      'Clones found',
      'Duplicated lines',
      'Duplicated tokens',
    ],
  });
  Object.keys(statistic.formats)
    .filter((format) => statistic.formats[format].sources)
    .forEach((format) => {
      table.push(convertStatisticToArray(format, statistic.formats[format].total));
    });
  table.push(convertStatisticToArray('Total:', statistic.total));
  console.log(table.toString());
  console.log(`Found ${statistic.total.clones} clones.`);
}

function isUtilsFile(filePath) {
  return /[/\\]utils[/\\]/i.test(filePath) || /[/\\]utils\.[^/\\]+$/.test(filePath);
}

function thresholdForClone(dup) {
  return isUtilsFile(dup.firstFile.name) || isUtilsFile(dup.secondFile.name)
    ? MAX_DUPLICATE_LINES_UTILS
    : MAX_DUPLICATE_LINES_PER_FILE;
}

function cloneMeetsLineThreshold(dup) {
  return cloneFragmentLineSpan(dup) >= thresholdForClone(dup);
}

/**
 * @param {string[]} projectDirs - Absolute paths to scan together in one jscpd pass.
 * @returns {{ ok: boolean, exitCode: number, rulePass?: boolean }}
 */
function runJscpd(projectDirs) {
  const patterns = scopedIgnoreGlobs(projectDirs);
  const jscpdBin = path.join(REPO_ROOT, 'node_modules', 'jscpd', 'bin', 'jscpd');

  if (!fs.existsSync(jscpdBin)) {
    console.error('jscpd not found. Run npm install from the repository root.');
    return { ok: false, exitCode: 1 };
  }

  const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jscpd-dup-'));
  const reportPath = path.join(reportDir, 'jscpd-report.json');

  const relPaths = projectDirs.map((dir) => path.relative(REPO_ROOT, dir));
  const args = [
    jscpdBin,
    ...relPaths,
    '-r',
    'json',
    '-o',
    reportDir,
    '-t',
    '100',
    '-g',
    ...patterns.flatMap((p) => ['-i', p]),
    '--silent',
  ];

  const t0 = performance.now();
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: process.env,
  });
  const elapsedMs = performance.now() - t0;

  try {
    if (result.error) {
      console.error(`failed to run jscpd: ${result.error.message}`);
      return { ok: false, exitCode: 1 };
    }

    const code = result.status ?? 1;
    if (code !== 0) {
      const err = result.stderr ? result.stderr.toString() : '';
      console.error(err || `jscpd exited with code ${code}`);
      return { ok: false, exitCode: code };
    }

    if (!fs.existsSync(reportPath)) {
      console.error(`expected report at ${reportPath}`);
      return { ok: false, exitCode: 1 };
    }

    const raw = fs.readFileSync(reportPath, 'utf8');
    const report = JSON.parse(raw);

    const listedClones = report.duplicates.filter(cloneMeetsLineThreshold);
    const pairAggregates = pairLineAggregatesFromListedClones(listedClones);
    const nearDuplicatePairPercentByKey = nearDuplicatePairOverlapPercentByKey(
      pairAggregates,
      report.statistics,
      FILE_PAIR_DUPLICATION_LINE_RATIO,
    );
    listedClones.sort((a, b) =>
      listedClonesSortComparator(a, b, nearDuplicatePairPercentByKey),
    );
    const violatingPaths = violatingPathsFromListedClones(listedClones);
    const rulePass = violatingPaths.size === 0;

    const displayStatistics = statisticsWithListedCloneMetrics(report.statistics, listedClones);
    for (const dup of listedClones) {
      printCloneBlock(dup, nearDuplicatePairPercentByKey);
    }

    printConsoleSummary(rulePass ? report.statistics : displayStatistics);
    console.log(`Detection time:: ${elapsedMs.toFixed(3)}ms`);
    console.log(rulePass ? 'PASS' : 'FAIL');
    if (!rulePass) {
      console.log('');
      console.log('Fix guidance: Parameterize functions with useful options instead of');
      console.log('mechanically extracting shared code. Shared functions should represent');
      console.log('meaningful operations, not just "code that was the same in two places."');
      console.log('See the top of scripts/check-duplicates.js for details.');
    }

    return { ok: true, exitCode: rulePass ? 0 : 1, rulePass };
  } finally {
    try {
      fs.rmSync(reportDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

function main() {
  if (process.env.JSCPD_SKIP === '1' || process.env.SKIP_JSCPD === '1') {
    console.log('Skipping duplicate check (JSCPD_SKIP or SKIP_JSCPD=1).');
    process.exit(0);
  }

  const clientDirs = [
    path.join(REPO_ROOT, 'startup', 'client'),
    path.join(REPO_ROOT, 'app', 'client'),
  ];
  const serverDirs = [
    path.join(REPO_ROOT, 'startup', 'server'),
    path.join(REPO_ROOT, 'app', 'server'),
  ];

  const missing = [...clientDirs, ...serverDirs].filter((dir) => !fs.existsSync(dir));
  if (missing.length > 0) {
    console.error(
      `Expected directories not found: ${missing.map((d) => path.relative(REPO_ROOT, d)).join(', ')}`,
    );
    process.exit(1);
  }

  const clientResult = runJscpd(clientDirs);
  if (!clientResult.ok) {
    process.exit(clientResult.exitCode ?? 1);
  }
  if (!clientResult.rulePass) {
    process.exit(1);
  }

  const serverResult = runJscpd(serverDirs);
  if (!serverResult.ok) {
    process.exit(serverResult.exitCode ?? 1);
  }
  if (!serverResult.rulePass) {
    process.exit(1);
  }

  process.exit(0);
}

main();
