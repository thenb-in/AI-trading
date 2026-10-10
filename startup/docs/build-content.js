// Composes the one manual the site serves out of two layers:
//   1. startup/docs/content  — the generic base manual (ships with the engine)
//   2. app/docs/content       — the app's own pages (optional overlay)
// The base is laid down first, then the app layer is copied on top: an app file
// at the same relative path replaces the generic one, and any new app file is
// added. The result is written to startup/docs/content-build, which is what
// Docusaurus reads. Pure Node fs so it runs the same on every platform.
const fs = require('fs');
const path = require('path');

const ENGINE_DIR = __dirname;
const BASE_CONTENT = path.join(ENGINE_DIR, 'content');
const APP_CONTENT = path.resolve(ENGINE_DIR, '..', '..', 'app', 'docs', 'content');
const MERGED_CONTENT = path.join(ENGINE_DIR, 'content-build');

function buildMergedContent() {
  fs.rmSync(MERGED_CONTENT, { recursive: true, force: true });
  fs.mkdirSync(MERGED_CONTENT, { recursive: true });

  // 1. Generic base manual.
  fs.cpSync(BASE_CONTENT, MERGED_CONTENT, { recursive: true });

  // 2. App overlay — present only when an app has authored its own pages.
  if (fs.existsSync(APP_CONTENT)) {
    fs.cpSync(APP_CONTENT, MERGED_CONTENT, { recursive: true });
  }

  const overlay = fs.existsSync(APP_CONTENT) ? APP_CONTENT : 'none';
  // eslint-disable-next-line no-console
  console.log('[docs] merged content -> ' + MERGED_CONTENT + ' (base: ' + BASE_CONTENT + ', app overlay: ' + overlay + ')');
  return MERGED_CONTENT;
}

module.exports = { buildMergedContent, MERGED_CONTENT };
