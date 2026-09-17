// What identifies a record of each master to a person: an item's code, a
// purchase order's number, or several fields put together ("Steel Rod (ITM-1)").
// Keyed by the master in words (a masters constant). A saved record's modal is
// titled by it.
//
// Shape: { [masterName]: field | (record) => string }.
import { MASTERS } from '@startup/constants/masters';

// The framework's own masters. An app registering its masters cannot wipe these,
// and can deliberately override one by registering the same key.
const frameworkIdentifiers = {
  [MASTERS.ROLE]: 'name',
  [MASTERS.USER]: (user) => (user.username && user.username !== user.name ? `${user.name} (${user.username})` : user.name),
  [MASTERS.NOTIFICATION_RULE]: 'name',
  [MASTERS.REPORT_RUN]: 'reportTitle',
  [MASTERS.NBNEXT_DRIVE]: 'fileName',
  [MASTERS.ACTIVITY]: 'head',
  [MASTERS.ANNOUNCEMENT]: 'title',
  // A place is known by where it sits — two cities called Springfield are only
  // told apart by what is above them.
  [MASTERS.GEOGRAPHY]: 'path',
};

const appIdentifiers = {};

/** { [masterName]: field | (record) => string } — the app's masters and what each is known by. */
const registerMasterIdentifiers = (identifiers) => {
  Object.assign(appIdentifiers, identifiers);
};

/** What a record is known by ("PO-0012"); empty for a master with none or a record not loaded yet. */
const recordIdentifier = (masterName, record) => {
  const identifier = appIdentifiers[masterName] ?? frameworkIdentifiers[masterName];
  if (!record || !identifier) return '';
  return (typeof identifier === 'function' ? identifier(record) : record[identifier]) ?? '';
};

export { registerMasterIdentifiers, recordIdentifier };
