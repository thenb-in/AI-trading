// Where each master's how-to lives in the product manual (served at /docs).
// Keyed by the master in words (a MASTERS constant). BaseMaster renders a Help
// link to it in the page header, so a person on a screen is one click from the
// manual section that explains it.
//
// Shape: { [masterName]: '/docs/<page>#<anchor>' }.

// The framework ships no doc links of its own — the manual is the app's content.
// An app registers its map via registerMasterDocLinks, built from the `docUrl`
// each master declares on its own module definition (see app/.../getMasterModules).
const frameworkMasterDocs = {};
const appMasterDocs = {};

/** { [masterName]: docUrl } — the app's masters and where each is documented. */
const registerMasterDocLinks = (links) => {
  Object.assign(appMasterDocs, links);
};

/** The manual URL for a master, or '' when none is registered. */
const masterDocUrl = (masterName) =>
  appMasterDocs[masterName] ?? frameworkMasterDocs[masterName] ?? '';

export { registerMasterDocLinks, masterDocUrl };
