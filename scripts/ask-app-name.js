#!/usr/bin/env node

const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

/**
 * Look up the git remote URL for the repo at cwd. Returns '' on any failure
 * (git missing, not a repo, no remote configured) — callers should treat '' as
 * "no git context" and fall through to folder-name / user-typed resolution.
 */
function resolveGitRemoteUrl(cwd) {
  try {
    return execSync('git config --get remote.origin.url', {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (error) {
    return '';
  }
}

function parseGitHubName(url) {
  try {
    let pathname = url;
    if (url.includes(':')) {
      pathname = url.split(':')[1] || '';
    } else if (url.includes('github.com/')) {
      pathname = (url.split('github.com/')[1] || '').replace(/^\//, '');
    }
    const withoutGit = (pathname || '').replace(/\.git$/i, '');
    const base = withoutGit.split('/').filter(Boolean).pop() || '';
    return base.trim();
  } catch (error) {
    return '';
  }
}

function getFolderName(rootDir) {
  try {
    const folder = path.basename(rootDir);
    return folder.trim();
  } catch (error) {
    return '';
  }
}

function askQuestion(rl, prompt, defaultValue = '') {
  return new Promise((resolve) => {
    const suffix = defaultValue ? ` [default: ${defaultValue}]` : '';
    rl.question(`${prompt}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Prompt for app name: folder name (default), GitHub-derived name, or custom (same UX as create-new-app).
 * @param {string} newAppUrl - Git remote URL or any string parseable by parseGitHubName
 * @param {string} [rootDir] - Repo root for "folder name" option (default: parent of this script)
 * @param {{ uiStream?: import('stream').Writable }} [options] - uiStream: where prompts go (default stdout; use stderr when stdout is captured)
 * @returns {Promise<string>} Trimmed display app name
 */
async function askNamingChoice(
  newAppUrl,
  rootDir = path.resolve(__dirname, '..'),
  options = {}
) {
  const uiStream = options.uiStream || process.stdout;
  const log = (line) => {
    uiStream.write(`${line}\n`);
  };

  const githubName = parseGitHubName(newAppUrl);
  const folderName = getFolderName(rootDir);
  const hasGithub = Boolean(githubName);
  const namesMatch =
    hasGithub &&
    Boolean(folderName) &&
    githubName.toLowerCase() === folderName.toLowerCase();
  const rl = readline.createInterface({ input: process.stdin, output: uiStream });

  log('');
  log('App name options:');
  if (namesMatch) {
    log(`  1. Folder & GitHub name: ${githubName}`);
  } else if (hasGithub) {
    log(`  1. Folder name: ${folderName || '(could not parse)'}`);
    log(`  2. GitHub name (from URL): ${githubName}`);
  } else {
    log(`  1. Folder name: ${folderName || '(could not parse)'}`);
  }
  log('  Or type your app name directly');
  log('');

  const choicePrompt =
    !namesMatch && hasGithub
      ? 'Choose (1/2) or type app name'
      : 'Choose (1) or type app name';
  const choice = await askQuestion(rl, choicePrompt, folderName || '');
  const c = choice.toLowerCase().trim();

  let appName;
  if (c === '1') {
    if (namesMatch) {
      appName = githubName;
    } else {
      appName = folderName;
      if (!appName) {
        log('Could not parse folder name; please type app name.');
        appName = await askQuestion(rl, 'App name', githubName || folderName);
      }
    }
  } else if (c === '2' && hasGithub) {
    appName = githubName;
  } else if (c === '') {
    appName = folderName || (await askQuestion(rl, 'App name', githubName));
  } else {
    appName = choice.trim();
  }

  rl.close();
  return appName.trim();
}

function sanitizeAppNameForPath(name, separator) {
  if (typeof separator !== 'string' || !separator) {
    throw new Error('sanitizeAppNameForPath: separator is required');
  }
  return name.trim().replace(/\s+/g, separator);
}

/**
 * Pick a separator consistent with any folder already present at the destination.
 * Lets new configs match existing naming conventions ("my-app" stays dashed,
 * "my_app" stays underscored) instead of being overridden by the caller's default.
 * Falls back to defaultSeparator only when the hint has no detectable separator.
 */
function resolveSeparator(folderHint, defaultSeparator) {
  if (typeof defaultSeparator !== 'string' || !defaultSeparator) {
    throw new Error('resolveSeparator: defaultSeparator is required');
  }
  if (folderHint) {
    if (folderHint.includes('-')) return '-';
    if (folderHint.includes('_')) return '_';
  }
  return defaultSeparator;
}

module.exports = {
  parseGitHubName,
  getFolderName,
  askQuestion,
  askNamingChoice,
  sanitizeAppNameForPath,
  resolveSeparator,
};

async function main() {
  const defaultSeparator = process.argv[2];
  let gitRef = process.argv[3];
  if (!defaultSeparator) {
    console.error('Usage: node scripts/ask-app-name.js <default-separator> [git-url-or-github-path]');
    console.error('  <default-separator> is used only if the destination folder has no "-" or "_" to match.');
    console.error('  [git-url] is optional; if omitted, the git remote is looked up from the current repo.');
    console.error('Prints sanitized deploy folder name to stdout (prompts on stderr / tty).');
    process.exit(1);
  }
  try {
    const rootDir = path.resolve(__dirname, '..');
    if (!gitRef) {
      gitRef = resolveGitRemoteUrl(rootDir);
    }
    const folderName = getFolderName(rootDir);
    const appName = await askNamingChoice(gitRef, rootDir, { uiStream: process.stderr });
    if (!appName) {
      console.error('App name cannot be empty');
      process.exit(1);
    }
    const separator = resolveSeparator(folderName, defaultSeparator);
    process.stdout.write(`${sanitizeAppNameForPath(appName, separator)}\n`);
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
