#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const clientRoot = path.join(repoRoot, 'client');

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  'coverage',
  '.cache',
]);

const TEXT_FILE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.md',
]);

const LOCAL_IMPORT_PREFIXES = [
  './',
  '../',
  '/',
  'src/',
  '@/',
  '@startup/',
  '@base_components/',
  '@context/',
  '@services/',
  '@report/',
  '@utils/',
  '@data/',
];

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function toSnakeCase(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function shouldSkipDirectory(name) {
  return IGNORE_DIRS.has(name);
}

function collectDirectories(dirPath, directories = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return directories;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (shouldSkipDirectory(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);
    directories.push(absolutePath);
    collectDirectories(absolutePath, directories);
  }

  return directories;
}

function relativeFromClient(absPath) {
  return toPosix(path.relative(clientRoot, absPath));
}

function getRenamePlan() {
  const allDirs = collectDirectories(clientRoot);
  const plan = [];

  for (const absPath of allDirs) {
    const oldName = path.basename(absPath);
    const newName = toSnakeCase(oldName);

    if (!newName || newName === oldName) {
      continue;
    }

    const parentPath = path.dirname(absPath);
    const newAbsPath = path.join(parentPath, newName);

    plan.push({
      oldName,
      newName,
      oldAbsPath: absPath,
      newAbsPath,
      oldRelPath: relativeFromClient(absPath),
      newRelPath: relativeFromClient(newAbsPath),
    });
  }

  return plan;
}

function validateRenamePlan(plan) {
  for (const step of plan) {
    const isCaseOnlyRename =
      step.oldAbsPath.toLowerCase() === step.newAbsPath.toLowerCase() &&
      step.oldAbsPath !== step.newAbsPath;

    if (fs.existsSync(step.newAbsPath) && !isCaseOnlyRename) {
      const destinationStats = fs.statSync(step.newAbsPath);
      if (!destinationStats.isDirectory()) {
        throw new Error(
          `Cannot rename ${step.oldRelPath} -> ${step.newRelPath}: destination exists and is not a directory.`
        );
      }
    }
  }
}

function mergeDirectoryInto(sourceDir, targetDir, stats, options) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const sourceEntries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of sourceEntries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    const targetExists = fs.existsSync(targetPath);

    if (entry.isDirectory()) {
      if (!targetExists) {
        fs.renameSync(sourcePath, targetPath);
        stats.movedEntries += 1;
        continue;
      }

      if (!fs.statSync(targetPath).isDirectory()) {
        throw new Error(
          `Cannot merge ${relativeFromClient(sourcePath)} into ${relativeFromClient(targetPath)}: destination is not a directory.`
        );
      }

      mergeDirectoryInto(sourcePath, targetPath, stats, options);
      fs.rmdirSync(sourcePath);
      continue;
    }

    if (!targetExists) {
      fs.renameSync(sourcePath, targetPath);
      stats.movedEntries += 1;
      continue;
    }

    const targetStats = fs.statSync(targetPath);
    if (targetStats.isDirectory()) {
      throw new Error(
        `Cannot merge ${relativeFromClient(sourcePath)} into ${relativeFromClient(targetPath)}: destination is a directory.`
      );
    }

    const sourceContent = fs.readFileSync(sourcePath);
    const targetContent = fs.readFileSync(targetPath);
    if (Buffer.compare(sourceContent, targetContent) !== 0) {
      if (options.conflictStrategy === 'abort') {
        throw new Error(
          `File conflict while merging ${relativeFromClient(sourceDir)} into ${relativeFromClient(targetDir)} at ${relativeFromClient(targetPath)}.`
        );
      }

      if (options.conflictStrategy === 'source') {
        fs.unlinkSync(targetPath);
        fs.renameSync(sourcePath, targetPath);
      } else {
        fs.unlinkSync(sourcePath);
      }
      stats.conflictsResolved += 1;
      continue;
    }

    fs.unlinkSync(sourcePath);
    stats.identicalFilesRemoved += 1;
  }
}

function renameDirectories(plan, dryRun) {
  const sorted = [...plan].sort((a, b) => b.oldAbsPath.length - a.oldAbsPath.length);
  const stats = {
    renamedDirs: 0,
    mergedDirs: 0,
    movedEntries: 0,
    identicalFilesRemoved: 0,
    conflictsResolved: 0,
  };
  const options = {
    conflictStrategy: process.env.SNAKE_CASE_CONFLICT_STRATEGY || 'target',
  };

  for (const step of sorted) {
    if (dryRun) {
      const isCaseOnlyRename =
        step.oldAbsPath.toLowerCase() === step.newAbsPath.toLowerCase() &&
        step.oldAbsPath !== step.newAbsPath;

      if (!isCaseOnlyRename && fs.existsSync(step.newAbsPath)) {
        stats.mergedDirs += 1;
      } else {
        stats.renamedDirs += 1;
      }
      continue;
    }

    const isCaseOnlyRename =
      step.oldAbsPath.toLowerCase() === step.newAbsPath.toLowerCase() &&
      step.oldAbsPath !== step.newAbsPath;

    if (isCaseOnlyRename) {
      const tempAbsPath = path.join(
        path.dirname(step.oldAbsPath),
        `${step.oldName}__tmp_rename__${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      );
      fs.renameSync(step.oldAbsPath, tempAbsPath);
      fs.renameSync(tempAbsPath, step.newAbsPath);
      stats.renamedDirs += 1;
      continue;
    }

    if (fs.existsSync(step.newAbsPath)) {
      mergeDirectoryInto(step.oldAbsPath, step.newAbsPath, stats, options);
      fs.rmdirSync(step.oldAbsPath);
      stats.mergedDirs += 1;
      continue;
    }

    fs.renameSync(step.oldAbsPath, step.newAbsPath);
    stats.renamedDirs += 1;
  }

  return stats;
}

function collectTextFiles(dirPath, files = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }
      collectTextFiles(absolutePath, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (TEXT_FILE_EXTENSIONS.has(ext)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSegmentRenameMap(plan) {
  const map = new Map();
  for (const step of plan) {
    if (step.oldName !== step.newName) {
      map.set(step.oldName, step.newName);
    }
  }
  return map;
}

function updateImportLikeString(value, segmentRenameMap) {
  if (!LOCAL_IMPORT_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return value;
  }

  const hasQuery = value.includes('?');
  const [rawPath, query = ''] = hasQuery ? value.split('?') : [value, ''];
  const segments = rawPath.split('/');

  const nextSegments = segments.map((segment) => {
    if (!segment || segment === '.' || segment === '..') {
      return segment;
    }
    return segmentRenameMap.get(segment) || segment;
  });

  const nextPath = nextSegments.join('/');
  return hasQuery ? `${nextPath}?${query}` : nextPath;
}

function updateTextContent(content, renamePathPairs, segmentRenameMap) {
  let next = content;

  // Replace explicit known folder paths first, deepest paths first.
  for (const { oldPath, newPath } of renamePathPairs) {
    if (!oldPath || oldPath === newPath) {
      continue;
    }

    const variants = [
      [oldPath, newPath],
      [`/${oldPath}`, `/${newPath}`],
    ];

    if (oldPath.startsWith('src/')) {
      const oldSrc = oldPath.slice(4);
      const newSrc = newPath.slice(4);
      variants.push([oldSrc, newSrc]);
      variants.push([`/${oldSrc}`, `/${newSrc}`]);
    }

    for (const [oldVariant, newVariant] of variants) {
      if (!oldVariant || oldVariant === newVariant) {
        continue;
      }
      const pattern = new RegExp(escapeRegExp(oldVariant), 'g');
      next = next.replace(pattern, newVariant);
    }
  }

  // Then update import-like string literals by renamed path segments.
  next = next.replace(/(['"`])([^'"`\n]+)\1/g, (full, quote, value) => {
    const updated = updateImportLikeString(value, segmentRenameMap);
    if (updated === value) {
      return full;
    }
    return `${quote}${updated}${quote}`;
  });

  return next;
}

function updateImports(plan, dryRun) {
  const textFiles = collectTextFiles(clientRoot);
  const sortedPlan = [...plan].sort((a, b) => b.oldRelPath.length - a.oldRelPath.length);
  const renamePathPairs = sortedPlan.map((step) => ({
    oldPath: step.oldRelPath,
    newPath: step.newRelPath,
  }));
  const segmentRenameMap = buildSegmentRenameMap(plan);

  let changedFiles = 0;
  for (const filePath of textFiles) {
    const before = fs.readFileSync(filePath, 'utf8');
    const after = updateTextContent(before, renamePathPairs, segmentRenameMap);

    if (before === after) {
      continue;
    }

    changedFiles += 1;
    if (!dryRun) {
      fs.writeFileSync(filePath, after, 'utf8');
    }
  }

  return changedFiles;
}

function parseArgs(argv) {
  const strategyArg = argv.find((arg) => arg.startsWith('--conflict='));
  const conflictStrategy = strategyArg ? strategyArg.split('=')[1] : null;

  if (conflictStrategy && !['target', 'source', 'abort'].includes(conflictStrategy)) {
    throw new Error("Invalid --conflict value. Use one of: target, source, abort");
  }

  if (conflictStrategy) {
    process.env.SNAKE_CASE_CONFLICT_STRATEGY = conflictStrategy;
  }

  return {
    dryRun: argv.includes('--dry-run'),
  };
}

function formatPlan(plan) {
  return plan
    .sort((a, b) => a.oldRelPath.localeCompare(b.oldRelPath))
    .map((step) => `  ${step.oldRelPath} -> ${step.newRelPath}`)
    .join('\n');
}

function main() {
  if (!fs.existsSync(clientRoot) || !fs.statSync(clientRoot).isDirectory()) {
    console.error('client directory not found. Run this from the repository root scripts context.');
    process.exit(1);
  }

  const { dryRun } = parseArgs(process.argv.slice(2));

  const plan = getRenamePlan();
  if (plan.length === 0) {
    console.log('No directory names require snake_case conversion in client.');
    process.exit(0);
  }

  validateRenamePlan(plan);

  console.log(dryRun ? 'Planned directory renames:' : 'Directory renames:');
  console.log(formatPlan(plan));

  const renameStats = renameDirectories(plan, dryRun);
  const changedFiles = updateImports(plan, dryRun);

  if (dryRun) {
    console.log('\nDry run complete. No files were changed.');
    console.log(`Renames planned: ${renameStats.renamedDirs}.`);
    console.log(`Merges planned: ${renameStats.mergedDirs}.`);
    console.log(`Imports that would be updated in ${changedFiles} files.`);
  } else {
    console.log(`\nRenamed ${renameStats.renamedDirs} directories.`);
    console.log(`Merged ${renameStats.mergedDirs} directories.`);
    if (renameStats.movedEntries > 0) {
      console.log(`Moved ${renameStats.movedEntries} entries while merging.`);
    }
    if (renameStats.identicalFilesRemoved > 0) {
      console.log(`Removed ${renameStats.identicalFilesRemoved} duplicate files with identical content.`);
    }
    if (renameStats.conflictsResolved > 0) {
      const strategy = process.env.SNAKE_CASE_CONFLICT_STRATEGY || 'target';
      console.log(`Resolved ${renameStats.conflictsResolved} file conflicts using '${strategy}' strategy.`);
    }
    console.log(`Updated imports/paths in ${changedFiles} files.`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
}
