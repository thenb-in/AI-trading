//
// git.js — thin wrappers around the git CLI, shared by both sync directions.
//

const path = require('path');
const { execFileSync } = require('child_process');

const MAX_BUFFER = 256 * 1024 * 1024;

function git(repo, args, { input, env } = {}) {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    input,
    env: env || process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: MAX_BUFFER,
  });
}

function gitBuf(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], {
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: MAX_BUFFER,
  });
}

function gitTry(repo, args) {
  try {
    return { ok: true, out: git(repo, args) };
  } catch (e) {
    return { ok: false, err: e };
  }
}

// Normalised remote URL, used purely to tell two checkouts apart.
// Strips the scheme, any credentials, a trailing `.git` and trailing
// slashes so `git@github.com:thenb-in/startup.git` and
// `https://github.com/thenb-in/startup` compare equal.
function remoteIdentity(repo, remote = 'origin') {
  const r = gitTry(repo, ['remote', 'get-url', remote]);
  if (!r.ok) return null;
  return r.out
    .trim()
    .replace(/^[a-z+]+:\/\//i, '')
    .replace(/^[^@/]*@/, '')
    .replace(/:/g, '/')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

// The framework receives commits from several app repos, so a provenance
// trailer has to say WHICH repo a commit came from — that is what lets each
// direction recognise and skip its own echoes.
function repoSlug(repoPath, fallback) {
  const id = remoteIdentity(repoPath);
  if (id) return id.split('/').pop();
  return fallback || path.basename(path.resolve(repoPath));
}

function trailerKeyFor(slug) {
  return `Synced-from-${slug}`;
}

module.exports = { git, gitBuf, gitTry, remoteIdentity, repoSlug, trailerKeyFor };
