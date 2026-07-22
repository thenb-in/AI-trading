/**
 * Registry for app-specific route → document-title knowledge. Startup is a
 * standalone library and only knows its own framework routes (auth, navigator,
 * reports, masters, users, company, roles, superadmin, guide). Each product
 * registers its own page titles here at boot (via registerAppData); startup
 * never imports the app.
 *
 * Shapes:
 *   titles          {[path: string]: string}          exact-path → title
 *   patterns        {pattern: RegExp, title: string}[] ordered; first match wins
 *   privatePrefixes string[]                           path prefixes marked noIndex
 */
let staticTitles = {};
let titlePatterns = [];
let privatePathPrefixes = [];

const registerAppRouteTitles = ({ titles, patterns, privatePrefixes } = {}) => {
  staticTitles = titles && typeof titles === 'object' ? titles : {};
  titlePatterns = Array.isArray(patterns) ? patterns : [];
  privatePathPrefixes = Array.isArray(privatePrefixes) ? privatePrefixes : [];
};

const getAppStaticTitles = () => staticTitles;
const getAppTitlePatterns = () => titlePatterns;
const getAppPrivatePathPrefixes = () => privatePathPrefixes;

export {
  registerAppRouteTitles,
  getAppStaticTitles,
  getAppTitlePatterns,
  getAppPrivatePathPrefixes,
};
