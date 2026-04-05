#!/usr/bin/env node

const path = require('path');
const readline = require('readline');

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
    return base.replace(/[_-]/g, ' ').trim();
  } catch (error) {
    return '';
  }
}

function getFolderName(rootDir) {
  try {
    const folder = path.basename(rootDir);
    return folder.replace(/[_-]/g, ' ').trim();
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
  const namesMatch =
    Boolean(githubName) &&
    Boolean(folderName) &&
    githubName.toLowerCase() === folderName.toLowerCase();
  const rl = readline.createInterface({ input: process.stdin, output: uiStream });

  log('');
  log('App name options:');
  if (namesMatch) {
    log(`  1. Folder & GitHub name: ${githubName}`);
  } else {
    log(`  1. Folder name: ${folderName || '(could not parse)'}`);
    log(`  2. GitHub name (from URL): ${githubName || '(could not parse)'}`);
  }
  log('  Or type your app name directly');
  log('');

  const choicePrompt = namesMatch ? 'Choose (1) or type app name' : 'Choose (1/2) or type app name';
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
  } else if (c === '2') {
    if (namesMatch) {
      appName = githubName;
    } else {
      appName = githubName;
      if (!appName) {
        log('Could not parse GitHub name; please type app name.');
        appName = await askQuestion(rl, 'App name', folderName || githubName);
      }
    }
  } else if (c === '') {
    appName = folderName || (await askQuestion(rl, 'App name', githubName));
  } else {
    appName = choice.trim();
  }

  rl.close();
  return appName.trim();
}

function sanitizeAppNameForPath(name) {
  return name.trim().replace(/\s+/g, '_');
}

module.exports = {
  parseGitHubName,
  getFolderName,
  askQuestion,
  askNamingChoice,
  sanitizeAppNameForPath,
};

async function main() {
  const gitRef = process.argv[2];
  if (!gitRef) {
    console.error('Usage: node scripts/ask-app-name.js <git-url-or-github-path>');
    console.error('Prints sanitized deploy folder name to stdout (prompts on stderr / tty).');
    process.exit(1);
  }
  try {
    const rootDir = path.resolve(__dirname, '..');
    const appName = await askNamingChoice(gitRef, rootDir, { uiStream: process.stderr });
    if (!appName) {
      console.error('App name cannot be empty');
      process.exit(1);
    }
    process.stdout.write(`${sanitizeAppNameForPath(appName)}\n`);
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
