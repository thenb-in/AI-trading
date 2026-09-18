//
// label.js — repo slugs used in provenance trailers and log labels.
//
// The framework receives commits from several app repos, so a trailer has to
// say WHICH repo a commit came from — that is what lets each direction
// recognise and skip its own echoes.
//

const path = require('path');

const { remoteIdentity } = require('./git');

function repoSlug(repoPath, fallback) {
  const id = remoteIdentity(repoPath);
  if (id) return id.split('/').pop();
  return fallback || path.basename(path.resolve(repoPath));
}

function trailerKeyFor(slug) {
  return `Synced-from-${slug}`;
}

module.exports = { repoSlug, trailerKeyFor };
