//
// report.js — run summary and log rendering (json / markdown / text).
//

const fs = require('fs');
const path = require('path');

const Table = require('cli-table3');

const PICK_KINDS = [
  ['cleanPicks', 'clean', 'target matched the source pre-image'],
  ['forcePicks', 'force', 'target had divergent content; overwritten'],
  ['mergedPicks', 'merged', 'target had divergent content; three-way merged'],
  ['conflictPicks', 'conflict', 'overlapping edits; source in tree, target parked'],
];

function summarize(results) {
  const sum = {
    totalCommits: results.commits.length,
    applied: 0,
    skipped: 0,
    failed: 0,
    appPicks: 0,
    appNonPicks: 0,
    excluded: 0,
    conflicts: (results.conflicts || []).length,
  };
  for (const [key] of PICK_KINDS) {
    sum[`framework_${key}`] = 0;
    sum[`ridealong_${key}`] = 0;
  }
  for (const c of results.commits) {
    if (c.error) sum.failed++;
    else if (c.skipped) sum.skipped++;
    else sum.applied++;
    for (const bucket of ['framework', 'ridealong']) {
      if (!c[bucket]) continue;
      for (const [key] of PICK_KINDS) sum[`${bucket}_${key}`] += c[bucket][key].length;
    }
    if (c.app) {
      sum.appPicks += c.app.picks.length;
      sum.appNonPicks += c.app.nonPicks.length;
    }
    if (c.excluded) sum.excluded += c.excluded.files.length;
  }
  return sum;
}

function metricRows(results, sum, direction) {
  const rows = [
    ['Commits examined', sum.totalCommits],
    ['Commits applied', sum.applied],
    ['Commits skipped', sum.skipped],
    ['Commits failed', sum.failed],
  ];
  for (const [key, label] of PICK_KINDS) {
    if (direction.conflictPolicy === 'source-wins' && (key === 'mergedPicks' || key === 'conflictPicks')) {
      continue;
    }
    rows.push([`Framework ${label} (files)`, sum[`framework_${key}`]]);
  }
  for (const [key, label] of PICK_KINDS) {
    if (direction.conflictPolicy === 'source-wins' && (key === 'mergedPicks' || key === 'conflictPicks')) {
      continue;
    }
    rows.push([`${direction.ridealongLabel} ${label} (files)`, sum[`ridealong_${key}`]]);
  }
  rows.push(['App picks (files)', sum.appPicks]);
  rows.push(['App non-picks (files)', sum.appNonPicks]);
  rows.push(['Excluded never-pick (files)', sum.excluded]);
  if (direction.conflictPolicy !== 'source-wins') {
    rows.push(['UNRESOLVED CONFLICTS (files)', sum.conflicts]);
  }
  if (results.tailup) {
    rows.push(['Tail-up refreshed (files)', results.tailup.refreshed.length]);
    rows.push(['Tail-up deleted (files)', results.tailup.deleted.length]);
  }
  return rows;
}

function fmtMd(f) {
  return f.oldPath ? `\`${f.oldPath}\` → \`${f.path}\`` : `\`${f.path}\``;
}

function renderPickSetMd(lines, set, label) {
  if (!set || set.total === 0) return;
  const counts = PICK_KINDS.filter(([key]) => set[key].length)
    .map(([key, name]) => `${name}: ${set[key].length}`)
    .join(', ');
  lines.push('');
  lines.push(`**${label}** files: ${set.total} (${counts || 'none applied'})`);
  for (const [key, name, blurb] of PICK_KINDS) {
    if (!set[key].length) continue;
    lines.push('');
    lines.push(`_${name} (${blurb}):_`);
    for (const f of set[key]) lines.push(`  - ${f.status} ${fmtMd(f)}`);
  }
}

function renderMarkdown(results, direction) {
  const sum = summarize(results);
  const lines = [];
  lines.push(`# ${direction.title} sync log`);
  lines.push('');
  lines.push(`- **Started:** ${results.startedAt}`);
  lines.push(`- **Finished:** ${results.finishedAt}`);
  lines.push(`- **Source:** ${direction.sourceLabel} @ \`${results.sourceBranch}\``);
  lines.push(`- **Target:** ${direction.targetLabel} @ \`${results.targetBaseBranch}\``);
  lines.push(`- **Range:** \`${results.fromSha || '(bootstrap)'}\`..\`${results.toSha}\``);
  lines.push(`- **Target branch:** \`${results.targetBranch}\``);
  lines.push('');
  lines.push(
    '> **Framework paths** (always picked, anchors the commit): ' +
    direction.frameworkPrefixes.map((p) => `\`${p}\``).join(', ') + '.  \n' +
    `> **${direction.ridealongLabel} paths** (always picked, but only on a commit that also ` +
    'has a framework change): ' +
    direction.ridealongPrefixes.map((p) => `\`${p}\``).join(', ') + '.  \n' +
    `> **Never-pick** (always skipped): ${direction.neverPickReason}.  \n` +
    '> **App paths** (everything else): picked only when the file already exists in the target.'
  );
  lines.push('');
  if (sum.conflicts > 0) {
    lines.push(`## ⛔ ${sum.conflicts} unresolved conflict(s)`);
    lines.push('');
    lines.push(
      'The tree holds the source version of each; the target\'s losing content is parked ' +
      'under `sync-conflicts/`. The PR is blocked until that directory is empty.'
    );
    lines.push('');
    lines.push('| File | Kind | Source commit |');
    lines.push('|---|---|---|');
    for (const c of results.conflicts) {
      lines.push(`| \`${c.path}\` | ${c.kind} | \`${c.sha.slice(0, 12)}\` |`);
    }
    lines.push('');
  }
  lines.push('## Run summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|---|---:|');
  for (const [label, count] of metricRows(results, sum, direction)) {
    lines.push(`| ${label} | ${count} |`);
  }
  lines.push('');
  if (results.tailup && (results.tailup.refreshed.length || results.tailup.deleted.length)) {
    lines.push('## Tail-up refresh');
    lines.push('');
    lines.push(
      'App files refreshed to source HEAD because later skipped source commits modified ' +
      'them after the picks above. Committed as ' +
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
    else if (c.skipped) lines.push(`- **Status:** ⏭️ SKIPPED — ${c.skipReason}`);
    else lines.push('- **Status:** ✅ applied');
    lines.push('');
    // Only emit the file-count breakdowns when the commit was actually
    // processed; for commit-level skips the totals live in the skip reason.
    if (!c.skipped && !c.error) {
      renderPickSetMd(lines, c.framework, 'framework');
      renderPickSetMd(lines, c.ridealong, direction.ridealongLabel);
      if (c.app) {
        lines.push('');
        lines.push(
          `**app** files: ${c.app.total} ` +
          `(picks: ${c.app.picks.length}, non-picks: ${c.app.nonPicks.length})`
        );
        if (c.app.picks.length) {
          lines.push('');
          lines.push('_picks (file existed in target, change applied):_');
          for (const f of c.app.picks) lines.push(`  - ${f.status} ${fmtMd(f)} _(${f.classification})_`);
        }
        if (c.app.nonPicks.length) {
          lines.push('');
          lines.push('_non-picks (file absent in target, change skipped):_');
          for (const f of c.app.nonPicks) lines.push(`  - ${f.status} ${fmtMd(f)} — ${f.reason}`);
        }
      }
      if (c.excluded && c.excluded.total > 0) {
        lines.push('');
        lines.push(`**excluded** files: ${c.excluded.total} (matched never-pick patterns)`);
        lines.push('');
        for (const f of c.excluded.files) lines.push(`  - ${f.status} ${fmtMd(f)} — ${f.reason}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderText(results, direction) {
  const sum = summarize(results);
  const out = [];
  out.push(`================ ${direction.key} sync ================`);
  out.push(`source: ${direction.sourceLabel} -> target: ${direction.targetLabel}`);
  out.push(`range:  ${results.fromSha || '(bootstrap)'} .. ${results.toSha}`);
  out.push(`branch: ${results.targetBranch}`);
  out.push('');

  const headTable = new Table({ head: ['Metric', 'Count'] });
  for (const row of metricRows(results, sum, direction)) headTable.push(row);
  out.push(headTable.toString());
  out.push(`framework prefixes: ${direction.frameworkPrefixes.join(', ')}`);
  out.push(
    `${direction.ridealongLabel} prefixes (need a framework change in the same commit): ` +
    direction.ridealongPrefixes.join(', ')
  );
  out.push(`never-pick:         ${direction.neverPickReason}`);
  out.push('');

  if (sum.conflicts > 0) {
    out.push(`!! ${sum.conflicts} UNRESOLVED CONFLICT(S) — parked under sync-conflicts/`);
    for (const c of results.conflicts) out.push(`   ${c.path}  (${c.kind})`);
    out.push('');
  }

  const fmt = (f) => (f.oldPath ? `${f.oldPath} -> ${f.path}` : f.path);
  for (const c of results.commits) {
    out.push(`--- ${c.sha.slice(0, 12)}  ${c.subject}`);
    out.push(`    author: ${c.author}`);
    if (c.error) out.push(`    status: FAILED -- ${c.error.split('\n')[0]}`);
    else if (c.skipped) out.push(`    status: SKIPPED -- ${c.skipReason}`);
    else out.push(`    status: applied as ${c.targetSha && c.targetSha.slice(0, 12)}`);

    if (!c.skipped && !c.error) {
      for (const [bucket, label] of [['framework', 'framework'], ['ridealong', direction.ridealongLabel]]) {
        const set = c[bucket];
        if (!set || set.total === 0) continue;
        const counts = PICK_KINDS.map(([key, name]) => `${name}=${set[key].length}`).join(' ');
        out.push(`    ${label}: total=${set.total} ${counts}`);
        for (const [key, name] of PICK_KINDS) {
          for (const f of set[key]) out.push(`      [${name}] ${f.status} ${fmt(f)}`);
        }
      }
      if (c.app) {
        out.push(
          `    app:       total=${c.app.total} ` +
          `picks=${c.app.picks.length} non-picks=${c.app.nonPicks.length}`
        );
        for (const f of c.app.picks) out.push(`      [pick]   ${f.status} ${fmt(f)}  (${f.classification})`);
        for (const f of c.app.nonPicks) out.push(`      [skip]   ${f.status} ${fmt(f)}  -- ${f.reason}`);
      }
      if (c.excluded && c.excluded.total > 0) {
        out.push(`    excluded:  total=${c.excluded.total}`);
        for (const f of c.excluded.files) out.push(`      [excl]   ${f.status} ${fmt(f)}`);
      }
    }
    out.push('');
  }
  return out.join('\n');
}

function writeLogs(results, logDir, direction) {
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'sync-log.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(logDir, 'sync-log.md'), renderMarkdown(results, direction));
  const text = renderText(results, direction);
  fs.writeFileSync(path.join(logDir, 'sync-log.txt'), text);
  return text;
}

module.exports = { summarize, renderMarkdown, renderText, writeLogs };
