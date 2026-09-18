#!/usr/bin/env node
//
// check-sync-conflicts.js — the gate that makes an unresolved sync conflict
// impossible to merge past.
//
// A sync run never fails on a conflict: it merges what it can, parks what it
// can't under sync-conflicts/, and always opens its PR. That keeps the branch
// buildable and testable, but it also means a conflict would otherwise be
// just a paragraph in a PR description — and PR descriptions get skimmed.
//
// So this runs as a required check. While anything is parked, the PR is
// mechanically unmergeable. Resolve by editing the real file to the
// reconciled result and deleting the .conflict file next to it.
//
// Exits 0 when clean, 1 when conflicts remain.
//

const fs = require('fs');
const path = require('path');

const { CONFLICT_DIR, CONFLICT_SUFFIX } = require('./lib/sync/merge');

function collect(dir, found) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, found);
    else if (entry.name.endsWith(CONFLICT_SUFFIX)) found.push(full);
  }
  return found;
}

function main() {
  const root = path.resolve(process.argv[2] || '.');
  const conflictRoot = path.join(root, CONFLICT_DIR);
  const found = collect(conflictRoot, []).map((p) => path.relative(root, p)).sort();

  if (found.length === 0) {
    console.log(`[sync-conflicts] clean — nothing parked under ${CONFLICT_DIR}/`);
    return;
  }

  console.error(`[sync-conflicts] ${found.length} unresolved sync conflict(s):`);
  for (const f of found) console.error(`  - ${f}`);
  console.error('');
  console.error('Each .conflict file holds a three-way merge of what this repo had, the');
  console.error('common ancestor, and the version being synced in. The real file in the');
  console.error('tree currently holds the incoming version.');
  console.error('');
  console.error('To resolve: edit the real file to the reconciled result, then delete the');
  console.error(`matching .conflict file. See ${CONFLICT_DIR}/REPORT.md for the full list.`);

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    fs.appendFileSync(
      summary,
      `## ⛔ ${found.length} unresolved sync conflict(s)\n\n` +
      found.map((f) => `- \`${f}\``).join('\n') +
      `\n\nResolve the real file, then delete its \`.conflict\` file.\n`
    );
  }
  process.exit(1);
}

main();
